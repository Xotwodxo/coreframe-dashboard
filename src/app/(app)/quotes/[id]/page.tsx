import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatPence } from "@/lib/format";
import { signedQuoteUrl } from "@/lib/quote-pdf";
import { formatLongDate, isExpired, lineTotal, summarise, totals, validUntil } from "@/lib/quotes";
import { getPriceItems, getQuote } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

import { QuoteBuilder } from "./quote-builder";
import { QuoteDecision, QuoteLinkButton, ReopenQuote } from "./quote-decision";

export const dynamic = "force-dynamic";

export default async function QuotePage({ params }: PageProps<"/quotes/[id]">) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  const back = quote.enquiry_id
    ? { href: `/enquiries/${quote.enquiry_id}`, label: "Enquiry" }
    : quote.client_id
      ? { href: `/clients/${quote.client_id}`, label: "Client" }
      : { href: "/enquiries", label: "Enquiries" };

  const expired = isExpired(quote);

  return (
    <>
      <Link href={back.href} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {back.label}
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-cyan-action">{quote.number}</p>
          <h1 className="text-2xl font-bold tracking-tight">{quote.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {quote.to_business ? `${quote.to_business} · ` : ""}
            {quote.to_name}
            {quote.sent_at ? ` · sent ${formatDate(quote.sent_at)}` : " · draft"}
          </p>
        </div>
        <StatusBadge status={expired ? "expired" : quote.status} />
      </div>

      {quote.status === "draft" ? (
        <QuoteBuilder quote={quote} priceItems={await getPriceItems()} />
      ) : (
        <SentQuote quoteId={quote.id} pdfPath={quote.pdf_path} lines={quote.lines} status={quote.status} hasEnquiry={Boolean(quote.enquiry_id)} decidedAt={quote.decided_at} validUntilLabel={formatLongDate(validUntil(quote))} expired={expired} summary={summarise(quote.lines)} />
      )}
    </>
  );
}

async function SentQuote({
  quoteId,
  pdfPath,
  lines,
  status,
  hasEnquiry,
  decidedAt,
  validUntilLabel,
  expired,
  summary,
}: {
  quoteId: string;
  pdfPath: string | null;
  lines: { description: string; kind: "one_off" | "monthly"; unit_pence: number; quantity: number }[];
  status: string;
  hasEnquiry: boolean;
  decidedAt: string | null;
  validUntilLabel: string;
  expired: boolean;
  summary: string;
}) {
  const supabase = await createClient();
  const url = pdfPath ? await signedQuoteUrl(supabase, pdfPath) : null;
  const sums = totals(lines);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-5">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-navy tabular-nums">{summary}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === "sent" ? (expired ? `Was valid until ${validUntilLabel}. Chase or close.` : `Valid until ${validUntilLabel}.`) : null}
          {status === "accepted" && decidedAt ? `Accepted ${formatDate(decidedAt)}.` : null}
          {status === "declined" && decidedAt ? `Declined ${formatDate(decidedAt)}.` : null}
        </p>
        <div className="mt-4">
          <QuoteLinkButton id={quoteId} initialUrl={url} />
        </div>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {lines.map((line, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {line.description}
              {line.quantity !== 1 ? <span className="text-muted-foreground"> x {line.quantity}</span> : null}
            </span>
            <span className="tabular-nums">
              {formatPence(lineTotal(line))}
              {line.kind === "monthly" ? <span className="text-muted-foreground"> /mo</span> : null}
            </span>
          </li>
        ))}
        {sums.oneOff > 0 && sums.monthly > 0 ? (
          <li className="flex justify-between px-4 py-3 text-sm font-medium text-navy">
            <span>One-off {formatPence(sums.oneOff)}</span>
            <span>Monthly {formatPence(sums.monthly)}</span>
          </li>
        ) : null}
      </ul>

      {status === "sent" ? <QuoteDecision id={quoteId} hasEnquiry={hasEnquiry} /> : null}
      <ReopenQuote id={quoteId} />
    </div>
  );
}
