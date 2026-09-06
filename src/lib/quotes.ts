import { formatPence } from "@/lib/format";
import { firstName } from "@/lib/reply";
import type { Quote, QuoteLine, QuoteSettings } from "@/lib/types";

/**
 * Quote arithmetic and wording. Totals are derived from the lines every time
 * they are shown, never stored. One-off and monthly total separately, because
 * "£1,250 plus £65 a month" is one quote.
 */

export const QUOTES_BUCKET = "quotes";

/** How long a signed link to the PDF lasts. Longer than any quote is valid. */
export const QUOTE_LINK_SECONDS = 30 * 24 * 60 * 60;

export function lineTotal(line: QuoteLine): number {
  return Math.round(line.unit_pence * line.quantity);
}

export function totals(lines: QuoteLine[]) {
  const oneOff = lines.filter((line) => line.kind === "one_off").reduce((sum, line) => sum + lineTotal(line), 0);
  const monthly = lines.filter((line) => line.kind === "monthly").reduce((sum, line) => sum + lineTotal(line), 0);
  return { oneOff, monthly };
}

export function deposit(quote: Pick<Quote, "lines" | "deposit_pct">) {
  const { oneOff } = totals(quote.lines);
  const depositPence = Math.round((oneOff * quote.deposit_pct) / 100);
  return { depositPence, balancePence: oneOff - depositPence };
}

/** "£1,250 one-off plus £65 a month", or just one of them. */
export function summarise(lines: QuoteLine[]): string {
  const { oneOff, monthly } = totals(lines);
  const parts: string[] = [];
  if (oneOff > 0) parts.push(`${formatPence(oneOff)} one-off`);
  if (monthly > 0) parts.push(`${formatPence(monthly)} a month`);
  return parts.join(" plus ") || "Nothing priced yet";
}

export function validUntil(quote: Pick<Quote, "sent_at" | "created_at" | "valid_days">): Date {
  const from = new Date(quote.sent_at ?? quote.created_at);
  return new Date(from.getTime() + quote.valid_days * 86_400_000);
}

export function isExpired(quote: Pick<Quote, "status" | "sent_at" | "created_at" | "valid_days">, now = Date.now()): boolean {
  return quote.status === "sent" && validUntil(quote).getTime() < now;
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function formatLongDate(date: Date): string {
  return LONG_DATE.format(date);
}

/** Fills the payment note's {deposit} and {balance}. */
export function paymentText(quote: Pick<Quote, "lines" | "deposit_pct">, template: string): string {
  const { depositPence, balancePence } = deposit(quote);
  const { oneOff } = totals(quote.lines);
  if (oneOff === 0) return "Monthly items start at go-live and roll monthly with 30 days notice.";
  return template
    .replaceAll("{deposit}", `${formatPence(depositPence)} (${quote.deposit_pct}%)`)
    .replaceAll("{balance}", formatPence(balancePence));
}

/**
 * The covering email. Placeholders: {first_name} {quote_number} {total}
 * {summary} {valid_until} {quote_link}.
 */
export function buildQuoteEmail(quote: Quote, settings: QuoteSettings, link: string) {
  const summaryLines = quote.lines
    .map((line) => {
      const qty = line.quantity !== 1 ? ` x ${line.quantity}` : "";
      const per = line.kind === "monthly" ? " a month" : "";
      return `- ${line.description}${qty}: ${formatPence(lineTotal(line))}${per}`;
    })
    .join("\n");
  const fill = (text: string) =>
    text
      .replaceAll("{first_name}", firstName(quote.to_name))
      .replaceAll("{quote_number}", quote.number)
      .replaceAll("{total}", summarise(quote.lines))
      .replaceAll("{summary}", summaryLines)
      .replaceAll("{valid_until}", formatLongDate(validUntil(quote)))
      .replaceAll("{quote_link}", link);
  const subject = fill(settings.subject);
  const body = fill(settings.body);
  const mailto = quote.to_email
    ? `mailto:${quote.to_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;
  return { subject, body, mailto };
}

export const DEFAULT_QUOTE_SETTINGS: QuoteSettings = {
  subject: "Quote {quote_number} from Coreframe Digital",
  body: "Hi {first_name},\n\nYour quote is attached. {quote_link}\n\nValid until {valid_until}.\n\nCharlie",
  notIncluded: "",
  paymentNote: "{deposit} deposit before work begins, {balance} on completion.",
  nextStep: "Reply to confirm and the deposit invoice follows.",
  validDays: 14,
  depositPct: 50,
};
