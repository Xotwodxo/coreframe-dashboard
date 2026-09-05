import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type {
  SeoAudit,
  SeoIssue,
  SeoPageResult,
} from "./types";

const USER_AGENT =
  "CoreframeSEO/1.0 (+local website audit; contact the site owner for details)";
const MAX_RESPONSE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 12_000;
const CRAWL_CONCURRENCY = 4;
const SKIPPED_EXTENSIONS =
  /\.(?:avif|bmp|css|csv|docx?|eot|gif|ico|jpe?g|js|json|mov|mp3|mp4|pdf|png|pptx?|rar|rss|svg|tar|tiff?|ttf|txt|webm|webp|woff2?|xlsx?|xml|zip)$/i;

type CrawledPage = SeoPageResult & { outgoingUrls: string[] };

function isPrivateAddress(address: string) {
  if (address === "::1" || address === "::" || address.startsWith("fe80:")) {
    return true;
  }

  const mappedIpv4 = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  const candidate = mappedIpv4 ?? address;

  if (isIP(candidate) === 4) {
    const [a, b] = candidate.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (isIP(candidate) === 6) {
    const first = Number.parseInt(candidate.split(":")[0] || "0", 16);
    return (first & 0xfe00) === 0xfc00;
  }

  return false;
}

async function assertPublicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a complete website address, such as https://example.com.");
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Only public HTTP and HTTPS websites can be audited.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Local and private network addresses cannot be audited.");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The website address does not resolve to a public server.");
  }

  return url;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/\s+/g, " ")
    .trim();
}

function attribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function metaContent(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = attribute(tag, "name") || attribute(tag, "property");
    if (name.toLowerCase() === key.toLowerCase()) return attribute(tag, "content");
  }
  return "";
}

function linkHref(html: string, relation: string) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = attribute(tag, "rel").toLowerCase().split(/\s+/);
    if (rel.includes(relation)) return attribute(tag, "href");
  }
  return "";
}

function normaliseCrawlUrl(value: string, origin: string) {
  try {
    const url = new URL(value, origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) return null;
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, "");
    if (SKIPPED_EXTENSIONS.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function readLimitedText(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Page is larger than the 2 MB audit limit.");
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Page is larger than the 2 MB audit limit.");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

async function publicFetch(urlValue: string) {
  let current = await assertPublicUrl(urlValue);

  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.8,*/*;q=0.5",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { response, finalUrl: current.toString() };
      current = await assertPublicUrl(new URL(location, current).toString());
      continue;
    }

    return { response, finalUrl: current.toString() };
  }

  throw new Error("The website redirected too many times.");
}

function pageFromHtml(
  requestedUrl: string,
  finalUrl: string,
  response: Response,
  html: string,
  responseTimeMs: number,
  origin: string
): CrawledPage {
  const title = decodeHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = metaContent(html, "description");
  const robots = `${metaContent(html, "robots")},${response.headers.get("x-robots-tag") ?? ""}`.toLowerCase();
  const h1Count = (html.match(/<h1\b[^>]*>/gi) ?? []).length;
  const canonicalValue = linkHref(html, "canonical");
  let canonical = "";
  try {
    canonical = canonicalValue ? new URL(canonicalValue, finalUrl).toString() : "";
  } catch {
    canonical = canonicalValue;
  }

  const anchorTags = html.match(/<a\b[^>]*>/gi) ?? [];
  const outgoingUrls: string[] = [];
  let externalLinks = 0;

  for (const tag of anchorTags) {
    const href = attribute(tag, "href");
    if (!href || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try {
      const resolved = new URL(href, finalUrl);
      if (resolved.origin === origin) {
        const normalised = normaliseCrawlUrl(resolved.toString(), origin);
        if (normalised) outgoingUrls.push(normalised);
      } else if (["http:", "https:"].includes(resolved.protocol)) {
        externalLinks += 1;
      }
    } catch {
      // Invalid links are surfaced through the page's low-quality link count later.
    }
  }

  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesMissingAlt = imageTags.filter((tag) => !/\balt\s*=/i.test(tag)).length;
  const visibleText = decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

  return {
    url: finalUrl || requestedUrl,
    status: response.status,
    responseTimeMs,
    title,
    titleLength: title.length,
    description,
    descriptionLength: description.length,
    canonical,
    h1Count,
    wordCount: visibleText ? visibleText.split(/\s+/).length : 0,
    internalLinks: outgoingUrls.length,
    externalLinks,
    images: imageTags.length,
    imagesMissingAlt,
    indexable:
      response.status >= 200 &&
      response.status < 300 &&
      !robots.includes("noindex"),
    outgoingUrls: [...new Set(outgoingUrls)],
  };
}

async function crawlPage(url: string, origin: string): Promise<CrawledPage> {
  const startedAt = performance.now();
  try {
    const { response, finalUrl } = await publicFetch(url);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const isHtml = contentType.includes("text/html") || contentType.includes("xhtml");
    const html = isHtml ? await readLimitedText(response) : "";
    return pageFromHtml(
      url,
      finalUrl,
      response,
      html,
      Math.round(performance.now() - startedAt),
      origin
    );
  } catch {
    return {
      url,
      status: 0,
      responseTimeMs: Math.round(performance.now() - startedAt),
      title: "",
      titleLength: 0,
      description: "",
      descriptionLength: 0,
      canonical: "",
      h1Count: 0,
      wordCount: 0,
      internalLinks: 0,
      externalLinks: 0,
      images: 0,
      imagesMissingAlt: 0,
      indexable: false,
      outgoingUrls: [],
    };
  }
}

function issue(
  severity: SeoIssue["severity"],
  category: SeoIssue["category"],
  title: string,
  explanation: string,
  recommendation: string,
  url?: string
): SeoIssue {
  return {
    id: `${category}-${title}-${url ?? "site"}`,
    severity,
    category,
    title,
    explanation,
    recommendation,
    url,
  };
}

function buildIssues(pages: CrawledPage[], robotsTxtFound: boolean, sitemapFound: boolean) {
  const issues: SeoIssue[] = [];
  const crawledByUrl = new Map(pages.map((page) => [page.url, page]));
  const titleGroups = new Map<string, string[]>();
  const descriptionGroups = new Map<string, string[]>();

  for (const page of pages) {
    if (page.status === 0 || page.status >= 500) {
      issues.push(issue("error", "crawl", "Page could not be loaded", "Search engines and visitors may be unable to access this page.", "Check the server, DNS and application logs, then make the page return HTTP 200.", page.url));
      continue;
    }
    if (page.status >= 400) {
      issues.push(issue("error", "crawl", `Broken page (${page.status})`, "This URL returns an error response.", "Restore the page or redirect it to the closest relevant working page.", page.url));
    }
    if (!page.indexable && page.status >= 200 && page.status < 300) {
      issues.push(issue("notice", "indexing", "Page is not indexable", "The page contains a noindex instruction or otherwise cannot be indexed.", "Confirm that this is intentional; remove the noindex directive from pages that should appear in search.", page.url));
    }
    if (!page.title) {
      issues.push(issue("error", "metadata", "Missing page title", "Search engines have no dedicated title to display for this page.", "Write a unique, descriptive title of roughly 30–60 characters.", page.url));
    } else {
      const key = page.title.toLowerCase();
      titleGroups.set(key, [...(titleGroups.get(key) ?? []), page.url]);
      if (page.titleLength < 20 || page.titleLength > 65) {
        issues.push(issue("warning", "metadata", "Page title length needs attention", `The title is ${page.titleLength} characters long.`, "Keep the title descriptive and usually within 30–60 characters.", page.url));
      }
    }
    if (!page.description) {
      issues.push(issue("warning", "metadata", "Missing meta description", "Google may choose an unpredictable excerpt for this page.", "Add a persuasive, page-specific description of roughly 120–160 characters.", page.url));
    } else {
      const key = page.description.toLowerCase();
      descriptionGroups.set(key, [...(descriptionGroups.get(key) ?? []), page.url]);
      if (page.descriptionLength < 70 || page.descriptionLength > 170) {
        issues.push(issue("notice", "metadata", "Meta description length needs attention", `The description is ${page.descriptionLength} characters long.`, "Aim for a clear description of roughly 120–160 characters.", page.url));
      }
    }
    if (page.h1Count === 0) {
      issues.push(issue("warning", "content", "Missing H1 heading", "The page has no primary heading to establish its subject.", "Add one clear H1 that describes the main purpose of the page.", page.url));
    } else if (page.h1Count > 1) {
      issues.push(issue("notice", "content", "Multiple H1 headings", `The page contains ${page.h1Count} H1 headings.`, "Use a single primary H1 where practical and structure subsections with H2/H3 headings.", page.url));
    }
    if (page.wordCount > 0 && page.wordCount < 120) {
      issues.push(issue("notice", "content", "Very little page content", `Only about ${page.wordCount} visible words were detected.`, "Make sure the page answers the visitor’s main questions with useful, original content.", page.url));
    }
    if (page.imagesMissingAlt > 0) {
      issues.push(issue("warning", "images", "Images missing alt text", `${page.imagesMissingAlt} of ${page.images} images do not have an alt attribute.`, "Add concise alternative text to meaningful images and an empty alt attribute to decorative images.", page.url));
    }
    if (page.responseTimeMs > 2000) {
      issues.push(issue("warning", "crawl", "Slow server response", `The page took ${page.responseTimeMs} ms to respond during this crawl.`, "Review hosting, caching and server-side work. Confirm performance with PageSpeed Insights.", page.url));
    }

    for (const target of page.outgoingUrls) {
      const targetPage = crawledByUrl.get(target);
      if (targetPage && (targetPage.status === 0 || targetPage.status >= 400)) {
        issues.push(issue("error", "links", "Broken internal link", "This page links to an internal URL that did not load successfully.", `Update or remove the link to ${target}.`, page.url));
      }
    }
  }

  for (const urls of titleGroups.values()) {
    if (urls.length > 1) {
      for (const url of urls) issues.push(issue("warning", "metadata", "Duplicate page title", `This title is shared by ${urls.length} crawled pages.`, "Give every indexable page a unique title that reflects its specific purpose.", url));
    }
  }
  for (const urls of descriptionGroups.values()) {
    if (urls.length > 1) {
      for (const url of urls) issues.push(issue("notice", "metadata", "Duplicate meta description", `This description is shared by ${urls.length} crawled pages.`, "Write a unique description for each important indexable page.", url));
    }
  }
  if (!robotsTxtFound) issues.push(issue("notice", "indexing", "robots.txt not found", "No robots.txt file was found at the site root.", "Add a simple robots.txt file and reference the XML sitemap."));
  if (!sitemapFound) issues.push(issue("warning", "indexing", "XML sitemap not found", "The crawler could not find a sitemap at the standard location or in robots.txt.", "Create an XML sitemap, reference it in robots.txt and submit it to Search Console."));

  return issues;
}

async function discoverSiteFiles(origin: string) {
  let robotsTxtFound = false;
  let sitemapFound = false;
  let sitemapUrl = `${origin}/sitemap.xml`;

  try {
    const { response } = await publicFetch(`${origin}/robots.txt`);
    const text = await readLimitedText(response);
    robotsTxtFound = response.ok && text.trim().length > 0;
    const declaredSitemap = text.match(/^\s*sitemap:\s*(\S+)/im)?.[1];
    if (declaredSitemap) sitemapUrl = new URL(declaredSitemap, origin).toString();
  } catch {
    // Absence is reported as an audit issue.
  }

  try {
    const { response } = await publicFetch(sitemapUrl);
    sitemapFound = response.ok;
    await response.body?.cancel();
  } catch {
    // Absence is reported as an audit issue.
  }

  return { robotsTxtFound, sitemapFound };
}

function auditScore(issues: SeoIssue[]) {
  const deductions = issues.reduce((total, item) => {
    if (item.severity === "error") return total + 7;
    if (item.severity === "warning") return total + 3;
    return total + 0.75;
  }, 0);
  return Math.max(0, Math.round(100 - Math.min(100, deductions)));
}

export async function runSeoAudit(input: {
  url: string;
  siteName?: string;
  maxPages?: number;
}): Promise<SeoAudit> {
  const startedAt = performance.now();
  const initialUrl = await assertPublicUrl(input.url.trim());
  initialUrl.hash = "";
  const maxPages = Math.min(100, Math.max(1, Math.round(input.maxPages ?? 40)));

  const initialFetch = await publicFetch(initialUrl.toString());
  await initialFetch.response.body?.cancel();
  const entry = new URL(initialFetch.finalUrl);
  const origin = entry.origin;
  const firstUrl = normaliseCrawlUrl(entry.toString(), origin) ?? `${origin}/`;
  const queued = [firstUrl];
  const seen = new Set<string>();
  const pages: CrawledPage[] = [];

  while (queued.length && pages.length < maxPages) {
    const batch: string[] = [];
    while (queued.length && batch.length < CRAWL_CONCURRENCY && pages.length + batch.length < maxPages) {
      const next = queued.shift()!;
      if (seen.has(next)) continue;
      seen.add(next);
      batch.push(next);
    }
    if (!batch.length) continue;

    const results = await Promise.all(batch.map((url) => crawlPage(url, origin)));
    pages.push(...results);
    for (const page of results) {
      for (const target of page.outgoingUrls) {
        if (!seen.has(target) && !queued.includes(target)) queued.push(target);
      }
    }
  }

  const { robotsTxtFound, sitemapFound } = await discoverSiteFiles(origin);
  const issues = buildIssues(pages, robotsTxtFound, sitemapFound);
  const score = auditScore(issues);
  const publicPages = pages.map(({ outgoingUrls, ...page }) => {
    void outgoingUrls;
    return page;
  });
  const errorCount = issues.filter((item) => item.severity === "error").length;
  const warningCount = issues.filter((item) => item.severity === "warning").length;

  return {
    id: crypto.randomUUID(),
    siteName: input.siteName?.trim() || entry.hostname.replace(/^www\./, ""),
    requestedUrl: input.url,
    finalUrl: firstUrl,
    auditedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - startedAt),
    score,
    grade: score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Needs work" : "Poor",
    crawlLimit: maxPages,
    pagesCrawled: publicPages.length,
    robotsTxtFound,
    sitemapFound,
    summary: {
      errors: errorCount,
      warnings: warningCount,
      notices: issues.length - errorCount - warningCount,
      indexablePages: publicPages.filter((page) => page.indexable).length,
      brokenPages: publicPages.filter((page) => page.status === 0 || page.status >= 400).length,
      averageResponseTimeMs: publicPages.length
        ? Math.round(publicPages.reduce((sum, page) => sum + page.responseTimeMs, 0) / publicPages.length)
        : 0,
    },
    pages: publicPages,
    issues,
  };
}
