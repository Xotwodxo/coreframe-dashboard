import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * One badge for every status in the system, so a colour always means the same
 * thing wherever it appears: amber needs Charlie, teal is in hand, navy is
 * committed, green is finished well, red is a problem, grey is closed.
 * Every tint is an alpha of a hex from the brand table.
 */
const TONES = {
  attention: "border-warn/30 bg-warn/10 text-warn",
  progress: "border-cyan-action/30 bg-cyan-action/10 text-cyan-action",
  committed: "border-navy/20 bg-navy/5 text-navy",
  good: "border-good/30 bg-good/10 text-good",
  bad: "border-bad/30 bg-bad/10 text-bad",
  closed: "border-border bg-muted text-muted-foreground",
} as const;

const STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  // enquiries
  new: { label: "New", tone: "attention" },
  replied: { label: "Replied", tone: "progress" },
  quoted: { label: "Quoted", tone: "committed" },
  won: { label: "Won", tone: "good" },
  lost: { label: "Lost", tone: "closed" },
  // care plans
  pending: { label: "Not yet billing", tone: "committed" },
  active: { label: "Active", tone: "good" },
  past_due: { label: "Payment failed", tone: "bad" },
  paused: { label: "Paused", tone: "attention" },
  cancelled: { label: "Cancelled", tone: "closed" },
  // requests
  scheduled: { label: "Scheduled", tone: "progress" },
  done: { label: "Done", tone: "good" },
  // quotes
  draft: { label: "Draft", tone: "closed" },
  sent: { label: "Sent", tone: "progress" },
  accepted: { label: "Accepted", tone: "good" },
  declined: { label: "Declined", tone: "closed" },
  expired: { label: "Expired", tone: "attention" },
};

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS[status] ?? { label: status, tone: "closed" as const };

  return (
    <Badge variant="outline" className={cn("shrink-0 font-medium", TONES[entry.tone])}>
      {entry.label}
    </Badge>
  );
}
