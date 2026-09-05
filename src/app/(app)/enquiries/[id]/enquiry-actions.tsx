"use client";

import { useState, useTransition } from "react";
import { FileText, Reply, Trophy, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NEXT_STATUSES } from "@/lib/enquiry-status";
import type { EnquiryStatus } from "@/lib/types";

import { setEnquiryStatus } from "../actions";

/** The forward step is the primary button; lost is always the quiet one. */
const FORWARD: Partial<Record<EnquiryStatus, { label: string; icon: typeof Reply }>> = {
  replied: { label: "Mark replied", icon: Reply },
  quoted: { label: "Mark quoted", icon: FileText },
  won: { label: "Mark won", icon: Trophy },
};

export function EnquiryActions({
  id,
  status,
}: {
  id: string;
  status: EnquiryStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mark(next: EnquiryStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setEnquiryStatus(id, next);
      if (result?.error) setError(result.error);
    });
  }

  const options = NEXT_STATUSES[status];
  const forward = options.find((option) => option !== "lost");
  const canLose = options.includes("lost");

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {status === "won"
          ? "This enquiry became a client."
          : "This enquiry was closed as lost."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {forward ? (
        <Button
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => mark(forward)}
        >
          {(() => {
            const Icon = FORWARD[forward]!.icon;
            return <Icon data-icon="inline-start" />;
          })()}
          {pending ? "Saving..." : FORWARD[forward]!.label}
        </Button>
      ) : null}

      {canLose ? (
        <Button
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => mark("lost")}
        >
          <XCircle data-icon="inline-start" />
          Mark lost
        </Button>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
