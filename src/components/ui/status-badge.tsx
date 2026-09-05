import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/enquiry-status";
import type { EnquiryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One badge for every status, so a colour always means the same thing:
 * amber needs Charlie, teal is in hand, navy is quoted, green is won, grey is
 * lost. Every tint is an alpha of a hex from the brand table.
 */
const TONES: Record<EnquiryStatus, string> = {
  new: "border-warn/30 bg-warn/10 text-warn",
  replied: "border-cyan-action/30 bg-cyan-action/10 text-cyan-action",
  quoted: "border-navy/20 bg-navy/5 text-navy",
  won: "border-good/30 bg-good/10 text-good",
  lost: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  return (
    <Badge variant="outline" className={cn("shrink-0 font-medium", TONES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
