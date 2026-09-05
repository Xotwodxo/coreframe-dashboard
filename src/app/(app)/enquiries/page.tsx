import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ALL_STATUSES, STATUS_LABELS, isEnquiryStatus } from "@/lib/enquiry-status";
import { formatRelative } from "@/lib/format";
import { getEnquiries } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({
  searchParams,
}: PageProps<"/enquiries">) {
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = isEnquiryStatus(raw) ? raw : undefined;

  const enquiries = await getEnquiries(status);

  const filters = [
    { value: undefined, label: "All" },
    ...ALL_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
  ];

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Everything that came in from coreframedigital.co.uk."
      />

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
                    {enquiry.service_interest ?? "Enquiry"} · {formatRelative(enquiry.received_at)}
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
