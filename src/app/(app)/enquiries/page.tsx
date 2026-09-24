import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ALL_STATUSES, STATUS_LABELS, isEnquiryStatus } from "@/lib/enquiry-status";
import { formatRelative } from "@/lib/format";
import { formatDuration } from "@/lib/lead-sources";
import { getEnquiries, getLeadStats } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({
  searchParams,
}: PageProps<"/enquiries">) {
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = isEnquiryStatus(raw) ? raw : undefined;

  const [enquiries, stats] = await Promise.all([getEnquiries(status), getLeadStats(90)]);

  const filters = [
    { value: undefined, label: "All" },
    ...ALL_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
  ];

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Every lead, from the website and everywhere else."
        action={
          <Link href="/enquiries/new" className={buttonVariants({ size: "sm" })}>
            <Plus data-icon="inline-start" />
            Log a lead
          </Link>
        }
      />

      <section
        aria-label="Speed to lead, last 90 days"
        className="mb-5 grid grid-cols-3 gap-2 rounded-xl border border-border p-4"
      >
        <div>
          <p className="text-xs text-muted-foreground">Median first reply</p>
          <p className="text-lg font-semibold text-navy">
            {stats.medianReplyMinutes === null ? "No data" : formatDuration(stats.medianReplyMinutes)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Replied within 1h</p>
          <p className="text-lg font-semibold text-navy">
            {stats.replied === 0 ? "No data" : `${stats.withinHour} of ${stats.replied}`}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Leads, 90 days</p>
          <p className="text-lg font-semibold text-navy">{stats.total}</p>
        </div>
        {stats.bySource.length > 0 ? (
          <p className="col-span-3 text-xs text-muted-foreground">
            {stats.bySource.map((row) => `${row.source} ${row.count}`).join(" · ")}
          </p>
        ) : null}
      </section>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => {
          const active = status === filter.value;
          return (
            <Link
              key={filter.label}
              href={filter.value ? `/enquiries?status=${filter.value}` : "/enquiries"}
              className={cn(
                "flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-cyan-action bg-cyan-action text-white"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {enquiries.length === 0 ? (
        <EmptyState
          title={status ? `Nothing marked ${STATUS_LABELS[status].toLowerCase()}` : "No enquiries yet"}
          description={
            status
              ? "Change the filter, or open an enquiry to move it along."
              : "When someone sends the form on coreframedigital.co.uk it appears here straight away."
          }
        />
      ) : (
        <ul className="space-y-2">
          {enquiries.map((enquiry) => (
            <li key={enquiry.id}>
              <Link
                href={`/enquiries/${enquiry.id}`}
                className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-cyan-action/40 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy">{enquiry.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {enquiry.service_interest ?? enquiry.lead_source} · {formatRelative(enquiry.received_at)}
                  </p>
                </div>
                <StatusBadge status={enquiry.status} />
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
