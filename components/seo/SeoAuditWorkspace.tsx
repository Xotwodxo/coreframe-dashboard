"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  SeoAudit,
  SeoIssue,
  SeoIssueSeverity,
} from "../../lib/seo/types";

const STORAGE_KEY = "coreframe-seo-audits-v1";
const TABS = ["Overview", "Issues", "Pages", "History"] as const;
type Tab = (typeof TABS)[number];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(milliseconds: number) {
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(1)} sec`;
}

function scoreColour(score: number) {
  if (score >= 90) return "#16a34a";
  if (score >= 75) return "#00aab2";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

function SeverityBadge({ severity }: { severity: SeoIssueSeverity }) {
  const styles = {
    error: "bg-red-50 text-red-700 ring-red-600/20",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
    notice: "bg-sky-50 text-sky-700 ring-sky-600/20",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "slate" | "red" | "amber" | "teal";
}) {
  const toneStyles = {
    slate: "border-slate-200",
    red: "border-red-200",
    amber: "border-amber-200",
    teal: "border-brand/60",
  };
  return (
    <div className={`rounded-xl border-t-2 bg-white p-4 shadow-sm ring-1 ring-slate-200 ${toneStyles[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ScoreDial({ audit }: { audit: SeoAudit }) {
  const colour = scoreColour(audit.score);
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-navy p-6 text-center text-white">
      <div
        className="grid h-36 w-36 place-items-center rounded-full p-3"
        style={{ background: `conic-gradient(${colour} ${audit.score * 3.6}deg, #334155 0deg)` }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-navy">
          <div>
            <p className="text-4xl font-semibold tracking-tight">{audit.score}</p>
            <p className="text-xs text-slate-400">out of 100</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-lg font-semibold">{audit.grade}</p>
      <p className="mt-1 text-xs text-slate-400">Coreframe technical health score</p>
    </div>
  );
}

function IssueRow({ item }: { item: SeoIssue }) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={item.severity} />
            <span className="text-xs font-medium capitalize text-slate-400">{item.category}</span>
          </div>
          <h3 className="mt-2 font-semibold text-slate-900">{item.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{item.explanation}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            <span className="font-semibold">Fix:</span> {item.recommendation}
          </p>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block truncate text-xs font-medium text-teal-700 hover:text-teal-900 hover:underline"
            >
              {item.url}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function SeoAuditWorkspace() {
  const [siteName, setSiteName] = useState("Floor Fitter Wales");
  const [url, setUrl] = useState("https://www.floorfitterwales.com");
  const [maxPages, setMaxPages] = useState(40);
  const [audits, setAudits] = useState<SeoAudit[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [severity, setSeverity] = useState<"all" | SeoIssueSeverity>("all");
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SeoAudit[];
        if (Array.isArray(parsed)) {
          // Loading saved audit history is the external-system synchronisation
          // this effect exists to perform.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAudits(parsed);
          setSelectedAuditId(parsed[0]?.id ?? null);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  const currentAudit = useMemo(
    () => audits.find((audit) => audit.id === selectedAuditId) ?? audits[0] ?? null,
    [audits, selectedAuditId]
  );

  const sameSiteAudits = useMemo(() => {
    if (!currentAudit) return [];
    try {
      const host = new URL(currentAudit.finalUrl).hostname;
      return audits.filter((audit) => new URL(audit.finalUrl).hostname === host);
    } catch {
      return [currentAudit];
    }
  }, [audits, currentAudit]);

  const currentSiteAuditIndex = sameSiteAudits.findIndex(
    (audit) => audit.id === currentAudit?.id
  );
  const previousAudit =
    currentSiteAuditIndex >= 0
      ? sameSiteAudits[currentSiteAuditIndex + 1] ?? null
      : null;

  const filteredIssues = useMemo(() => {
    if (!currentAudit) return [];
    const query = search.trim().toLowerCase();
    return currentAudit.issues.filter((item) => {
      const matchesSeverity = severity === "all" || item.severity === severity;
      const matchesSearch =
        !query ||
        `${item.title} ${item.explanation} ${item.url ?? ""}`.toLowerCase().includes(query);
      return matchesSeverity && matchesSearch;
    });
  }, [currentAudit, search, severity]);

  function saveAudits(next: SeoAudit[]) {
    const limited = next.slice(0, 12);
    setAudits(limited);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch {
      const reduced = limited.slice(0, 6);
      setAudits(reduced);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
    }
  }

  async function runAudit(event: React.FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError("");

    try {
      const response = await fetch("/api/seo/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteName, url, maxPages }),
      });
      const result = (await response.json()) as { audit?: SeoAudit; error?: string };
      if (!response.ok || !result.audit) {
        throw new Error(result.error || "The audit could not be completed.");
      }
      saveAudits([result.audit, ...audits]);
      setSelectedAuditId(result.audit.id);
      setActiveTab("Overview");
    } catch (auditError) {
      setError(auditError instanceof Error ? auditError.message : "The audit could not be completed.");
    } finally {
      setRunning(false);
    }
  }

  function exportAudit(audit: SeoAudit) {
    const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${audit.siteName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${audit.auditedAt.slice(0, 10)}-seo-audit.json`;
    link.click();
    URL.revokeObjectURL(href);
  }

  function deleteAudit(auditId: string) {
    if (!window.confirm("Delete this saved audit from this browser?")) return;
    const next = audits.filter((audit) => audit.id !== auditId);
    saveAudits(next);
    if (selectedAuditId === auditId) setSelectedAuditId(next[0]?.id ?? null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand/15 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-teal-800">Beta</span>
            <span className="text-sm text-slate-500">Local website intelligence</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">SEO workspace</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Crawl managed websites, find technical problems and preserve dated evidence for client reporting.
          </p>
        </div>
        {currentAudit && (
          <button
            type="button"
            onClick={() => exportAudit(currentAudit)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Export audit
          </button>
        )}
      </div>

      <form onSubmit={runAudit} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr_140px_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project name</span>
            <input
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Client or website name"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website address</span>
            <input
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="https://example.com"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Page limit</span>
            <select
              value={maxPages}
              onChange={(event) => setMaxPages(Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value={10}>10 pages</option>
              <option value={25}>25 pages</option>
              <option value={40}>40 pages</option>
              <option value={75}>75 pages</option>
              <option value={100}>100 pages</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={running}
            className="inline-flex min-h-10.5 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
          >
            {running && <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />}
            {running ? "Crawling…" : "Run audit"}
          </button>
        </div>
        {running && (
          <p className="mt-3 text-xs text-slate-500">Following internal links and checking page metadata. Larger audits can take around a minute.</p>
        )}
        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
      </form>

      {!hydrated ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      ) : !currentAudit ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-2xl text-teal-700">↗</div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Create the first SEO baseline</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Floor Fitter Wales is ready above. Run the old-site audit before launch, then repeat it after the new website goes live.
          </p>
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{currentAudit.siteName}</h2>
                  <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700 ring-1 ring-green-600/20">Audit complete</span>
                </div>
                <a href={currentAudit.finalUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-teal-700 hover:underline">
                  {currentAudit.finalUrl}
                </a>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{formatDate(currentAudit.auditedAt)}</p>
                <p className="mt-1">{currentAudit.pagesCrawled} pages in {formatDuration(currentAudit.durationMs)}</p>
              </div>
            </div>
            <nav
              className="flex overflow-x-auto px-3"
              aria-label="SEO audit sections"
              role="tablist"
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`border-b-2 px-4 py-3 text-sm font-medium transition ${activeTab === tab ? "border-brand text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                >
                  {tab}
                  {tab === "Issues" && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">{currentAudit.issues.length}</span>}
                </button>
              ))}
            </nav>
          </section>

          {activeTab === "Overview" && (
            <div
              className="grid gap-6 xl:grid-cols-[280px_1fr]"
              role="tabpanel"
            >
              <ScoreDial audit={currentAudit} />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <MetricCard label="Errors" value={currentAudit.summary.errors} detail="Highest-priority fixes" tone="red" />
                <MetricCard label="Warnings" value={currentAudit.summary.warnings} detail="Improvements to review" tone="amber" />
                <MetricCard label="Indexable" value={`${currentAudit.summary.indexablePages}/${currentAudit.pagesCrawled}`} detail="Pages available to search" tone="teal" />
                <MetricCard label="Broken pages" value={currentAudit.summary.brokenPages} detail="HTTP errors or failures" />
                <MetricCard label="Avg response" value={`${currentAudit.summary.averageResponseTimeMs} ms`} detail="Across this crawl" />
                <MetricCard label="Site files" value={`${currentAudit.robotsTxtFound ? "✓" : "—"} / ${currentAudit.sitemapFound ? "✓" : "—"}`} detail="robots.txt / sitemap" />
              </div>

              {previousAudit && (
                <section className="xl:col-span-2 rounded-2xl bg-navy-light p-5 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand">Change since previous audit</p>
                      <h3 className="mt-2 text-lg font-semibold">{formatDate(previousAudit.auditedAt)} → now</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-right">
                      <div><p className="text-2xl font-semibold">{currentAudit.score - previousAudit.score >= 0 ? "+" : ""}{currentAudit.score - previousAudit.score}</p><p className="text-xs text-slate-400">score</p></div>
                      <div><p className="text-2xl font-semibold">{currentAudit.summary.errors - previousAudit.summary.errors}</p><p className="text-xs text-slate-400">errors</p></div>
                      <div><p className="text-2xl font-semibold">{currentAudit.pagesCrawled - previousAudit.pagesCrawled >= 0 ? "+" : ""}{currentAudit.pagesCrawled - previousAudit.pagesCrawled}</p><p className="text-xs text-slate-400">pages</p></div>
                    </div>
                  </div>
                </section>
              )}

              <section className="xl:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Priority fixes</h2>
                  <button type="button" onClick={() => setActiveTab("Issues")} className="text-sm font-semibold text-teal-700 hover:underline">View all issues</button>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {currentAudit.issues.slice(0, 6).map((item) => <IssueRow key={item.id} item={item} />)}
                  {!currentAudit.issues.length && <div className="rounded-xl bg-green-50 p-5 text-sm text-green-800 ring-1 ring-green-200">No technical issues were detected in the crawled pages.</div>}
                </div>
              </section>
            </div>
          )}

          {activeTab === "Issues" && (
            <section role="tabpanel">
              <div className="mb-4 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {(["all", "error", "warning", "notice"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSeverity(value)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${severity === value ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search issues or URLs"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:max-w-xs"
                />
              </div>
              <p className="mb-3 text-sm text-slate-500">Showing {filteredIssues.length} of {currentAudit.issues.length} findings</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredIssues.map((item) => <IssueRow key={item.id} item={item} />)}
              </div>
            </section>
          )}

          {activeTab === "Pages" && (
            <section
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              role="tabpanel"
            >
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Crawled pages</h2>
                <p className="mt-1 text-sm text-slate-500">A page-level inventory from this audit snapshot.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Page</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Title</th>
                      <th className="px-4 py-3 font-semibold">H1</th>
                      <th className="px-4 py-3 font-semibold">Words</th>
                      <th className="px-4 py-3 font-semibold">Response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentAudit.pages.map((page) => (
                      <tr key={page.url} className="hover:bg-slate-50">
                        <td className="max-w-sm px-5 py-3"><a href={page.url} target="_blank" rel="noreferrer" className="block truncate font-medium text-teal-700 hover:underline">{new URL(page.url).pathname || "/"}</a><span className="block truncate text-xs text-slate-400">{page.url}</span></td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${page.status >= 200 && page.status < 400 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{page.status || "Failed"}</span></td>
                        <td className="max-w-xs px-4 py-3"><span className="block truncate text-slate-700">{page.title || "Missing"}</span><span className="text-xs text-slate-400">{page.titleLength} chars</span></td>
                        <td className="px-4 py-3 text-slate-600">{page.h1Count}</td>
                        <td className="px-4 py-3 text-slate-600">{page.wordCount}</td>
                        <td className="px-4 py-3 text-slate-600">{page.responseTimeMs} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "History" && (
            <section
              className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              role="tabpanel"
            >
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Saved audit history</h2>
                <p className="mt-1 text-sm text-slate-500">Stored privately in this browser. Export important baselines for safekeeping.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {audits.map((audit) => (
                  <div key={audit.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                    <button type="button" onClick={() => setSelectedAuditId(audit.id)} className="min-w-0 text-left">
                      <div className="flex items-center gap-2"><span className="font-semibold text-slate-900">{audit.siteName}</span>{audit.id === currentAudit.id && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-teal-800">Selected</span>}</div>
                      <p className="mt-1 truncate text-xs text-slate-500">{formatDate(audit.auditedAt)} · {audit.pagesCrawled} pages · {audit.finalUrl}</p>
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><p className="text-xl font-semibold" style={{ color: scoreColour(audit.score) }}>{audit.score}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">score</p></div>
                      <button type="button" onClick={() => exportAudit(audit)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Export</button>
                      <button type="button" onClick={() => deleteAudit(audit.id)} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
