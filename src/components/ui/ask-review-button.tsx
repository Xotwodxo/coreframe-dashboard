"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Opens the mail app with the review ask filled in and records the ask in
 * the same tap, like Reply. Shows when it was last asked so it is not asked
 * twice by accident, but never blocks a second ask.
 */
export function AskReviewButton({
  mailto,
  lastAsked,
  hasLinks,
  onTap,
}: {
  mailto: string | null;
  lastAsked: string | null;
  hasLinks: boolean;
  onTap: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  const disabledReason = !mailto
    ? "No email address to send to"
    : !hasLinks
      ? "Add a review link in the Kit tab first"
      : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {disabledReason ? (
        <span className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground opacity-60">
          <Star className="size-4" aria-hidden />
          Ask for a review
        </span>
      ) : (
        <a
          href={mailto!}
          onClick={() => startTransition(() => onTap())}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted",
            pending && "opacity-70"
          )}
        >
          <Star className="size-4 text-warn" aria-hidden />
          {lastAsked ? "Ask again" : "Ask for a review"}
        </a>
      )}
      <span className="text-xs text-muted-foreground">
        {disabledReason ?? (lastAsked ? `Asked ${formatDate(lastAsked)}` : "Opens an email with your Google and Trustpilot links")}
      </span>
    </div>
  );
}
