export type SeoIssueSeverity = "error" | "warning" | "notice";

export type SeoIssue = {
  id: string;
  severity: SeoIssueSeverity;
  category: "crawl" | "indexing" | "content" | "metadata" | "links" | "images";
  title: string;
  explanation: string;
  recommendation: string;
  url?: string;
};

export type SeoPageResult = {
  url: string;
  status: number;
  responseTimeMs: number;
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  canonical: string;
  h1Count: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesMissingAlt: number;
  indexable: boolean;
};

export type SeoAudit = {
  id: string;
  siteName: string;
  requestedUrl: string;
  finalUrl: string;
  auditedAt: string;
  durationMs: number;
  score: number;
  grade: "Excellent" | "Good" | "Needs work" | "Poor";
  crawlLimit: number;
  pagesCrawled: number;
  robotsTxtFound: boolean;
  sitemapFound: boolean;
  summary: {
    errors: number;
    warnings: number;
    notices: number;
    indexablePages: number;
    brokenPages: number;
    averageResponseTimeMs: number;
  };
  pages: SeoPageResult[];
  issues: SeoIssue[];
};

export type SeoAuditRequest = {
  siteName?: string;
  url: string;
  maxPages?: number;
};
