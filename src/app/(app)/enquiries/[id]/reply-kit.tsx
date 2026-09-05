"use client";

import { useActionState, useTransition } from "react";
import { ExternalLink, MessageSquarePlus, PoundSterling, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { addNoteAction, recordReply, setQuotedAction, type NoteState } from "../actions";

const initial: NoteState = { error: null };

/**
 * The primary action. Opens the phone's mail app with the reply filled in and,
 * in the same tap, records that a reply went out. The mail app cannot report
 * back, so the tap is the record. Charlie's decision, 5 Sep 2026.
 */
export function ReplyButton({ id, mailto, isNew }: { id: string; mailto: string | null; isNew: boolean }) {
  const [pending, startTransition] = useTransition();

  if (!mailto) {
    return (
      <span className="flex h-14 items-center justify-center gap-2 rounded-xl bg-cyan-action/40 font-medium text-white" aria-disabled>
        <Send className="size-4" aria-hidden />
        No email given
      </span>
    );
  }

  return (
    <a
      href={mailto}
      onClick={() => startTransition(() => recordReply(id))}
      className={cn(
        "flex h-14 items-center justify-center gap-2 rounded-xl bg-cyan-action font-medium text-white transition-colors hover:bg-cyan-action/90",
        pending && "opacity-70"
      )}
    >
      <Send className="size-4" aria-hidden />
      {isNew ? "Reply" : "Email again"}
    </a>
  );
}

export interface SendItem {
  label: string;
  detail: string | null;
  url: string;
  primary?: boolean;
}

export function SendList({ items }: { items: SendItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {items.map((item) => (
        <li key={item.url} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy">
              {item.label}
              {item.primary ? <span className="ml-2 text-xs font-normal text-cyan-action">in the reply</span> : null}
            </p>
            {item.detail ? <p className="truncate text-xs text-muted-foreground">{item.detail}</p> : null}
          </div>
          <CopyButton value={item.url} label="Copy" />
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.label}`} className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function QuotedForm({ id, current }: { id: string; current: number | null }) {
  const [state, action, pending] = useActionState(setQuotedAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="space-y-1">
        <Label htmlFor="quoted" className="text-xs text-muted-foreground">
          Quoted, in pounds
        </Label>
        <Input
          id="quoted"
          name="quoted"
          inputMode="decimal"
          className="w-36"
          defaultValue={current !== null ? (current / 100).toString() : ""}
          placeholder="1250"
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        <PoundSterling data-icon="inline-start" />
        {pending ? "Saving..." : current !== null ? "Update" : "Record quote"}
      </Button>
      {state.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}

export function NoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addNoteAction, initial);
  return (
    <form action={action} className="space-y-2" key={state.error ?? "ok"}>
      <input type="hidden" name="id" value={id} />
      <Textarea name="body" rows={2} placeholder="Called, no answer. Try Tuesday." required />
      <FormMessage error={state.error} />
      <Button type="submit" variant="outline" disabled={pending}>
        <MessageSquarePlus data-icon="inline-start" />
        {pending ? "Saving..." : "Add note"}
      </Button>
    </form>
  );
}
