import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRelative } from "@/lib/format";
import { getWaitingEnquiries } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Today: what needs a reply, and nothing else.
 *
 * Deliberately not a dashboard. The one thing this screen does that the list
 * does not is flag anything still at `new` after 24 hours, because that is
 * the only behaviour phase 1 is meant to change.
 */
export default async function TodayPage() {
  const waiting = await getWaitingEnquiries();
  const overdue = waiting.filter((enquiry) => enquiry.overdue);

  const description =
    waiting.length === 0
      ? "Nothing waiting for a reply."
      : overdue.length > 0
        ? `${plural(waiting.length, "enquiry", "enquiries")} waiting, ${overdue.length} over a day old.`
        : `${plural(waiting.length, "enquiry", "enquiries")} waiting for a reply.`;

  return (
    <>
      <PageHeader title="Today" description={description} />

      {waiting.length === 0 ? (
        <EmptyState
          title="No enquiries yet"
          description="When someone sends the form on coreframedigital.co.uk it lands here straight away, before the email does."
        />
      ) : (
        <ul className="space-y-2">
          {waiting.map((enquiry) => {
            const late = enquiry.overdue;
            return (
              <li key={enquiry.id}>
                <Link
                  href={`/enquiries/${enquiry.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50",
                    late
                      ? "border-bad/40 hover:border-bad/60"
                      : "border-border hover:border-cyan-action/40"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy">{enquiry.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {enquiry.service_interest ?? "Enquiry"} · {formatRelative(enquiry.received_at)}
                    </p>
                    {late ? (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-bad">
                        <Clock className="size-3.5" aria-hidden />
                        Waiting over 24 hours
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge status={enquiry.status} />
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}
