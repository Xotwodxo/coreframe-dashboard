import Link from "next/link";
import { ArrowRight, FilePlus } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import { isExpired, summarise } from "@/lib/quotes";
import type { Quote } from "@/lib/types";

/** The quotes attached to an enquiry or a client, and the button that starts one. */
export function QuotesList({ quotes, onNew }: { quotes: Quote[]; onNew: () => Promise<void> }) {
  return (
    <div className="space-y-3">
      {quotes.length > 0 ? (
        <ul className="space-y-2">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <Link href={`/quotes/${quote.id}`} className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-cyan-action/40 hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy">
                    <span className="text-cyan-action">{quote.number}</span> · {quote.title}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {summarise(quote.lines)}
                    {quote.sent_at ? ` · sent ${formatDate(quote.sent_at)}` : ""}
                  </p>
                </div>
                <StatusBadge status={isExpired(quote) ? "expired" : quote.status} />
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={onNew}>
        <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted">
          <FilePlus className="size-4 text-cyan-action" aria-hidden />
          New quote
        </button>
      </form>
    </div>
  );
}
