"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Link2, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FormMessage } from "@/components/ui/form-message";

import { decideQuoteAction, freshQuoteLink, reopenQuoteAction, type QuoteState } from "../actions";

const initial: QuoteState = { error: null };

export function QuoteLinkButton({ id, initialUrl }: { id: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {url ? <CopyButton value={url} label="Copy PDF link" /> : null}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border px-2.5 text-[0.8rem] font-medium hover:bg-muted">
          Open PDF
        </a>
      ) : null}
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => setUrl(await freshQuoteLink(id)))}>
        <Link2 data-icon="inline-start" />
        {pending ? "Making a link..." : "New 30-day link"}
      </Button>
    </div>
  );
}

export function QuoteDecision({ id, hasEnquiry }: { id: string; hasEnquiry: boolean }) {
  const [state, action, pending] = useActionState(decideQuoteAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="accepted" disabled={pending}>
          <Check data-icon="inline-start" />
          Accepted{hasEnquiry ? ", mark won" : ""}
        </Button>
        <Button type="submit" name="decision" value="declined" variant="outline" disabled={pending}>
          <X data-icon="inline-start" />
          Declined
        </Button>
      </div>
      {hasEnquiry ? (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="close_enquiry" className="size-4 accent-[var(--cyan-action)]" />
          If declined, also mark the enquiry lost
        </label>
      ) : null}
      <FormMessage error={state.error} ok={state.ok} />
    </form>
  );
}

export function ReopenQuote({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reopenQuoteAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <FormMessage error={state.error} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        <RotateCcw data-icon="inline-start" />
        Edit and send again
      </Button>
    </form>
  );
}
