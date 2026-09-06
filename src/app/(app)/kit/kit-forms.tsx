"use client";

import { useActionState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatPence } from "@/lib/format";
import type { DocumentRow, PriceItem, QuoteSettings, ReplySettings, ReviewSettings } from "@/lib/types";

import {
  addDocumentAction,
  deleteDocumentAction,
  addPriceItemAction,
  saveQuoteWordingAction,
  saveReplyAction,
  saveReviewAction,
  updateDocumentAction,
  updatePriceItemAction,
  type KitState,
} from "./actions";

const initial: KitState = { error: null };

export function ReplyWordingForm({ settings }: { settings: ReplySettings }) {
  const [state, action, pending] = useActionState(saveReplyAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" defaultValue={settings.subject} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Email</Label>
        <Textarea id="body" name="body" defaultValue={settings.body} rows={14} required className="font-mono text-sm" />
        <p className="text-xs text-muted-foreground">
          Placeholders: <code>{"{first_name}"}</code> <code>{"{service}"}</code> <code>{"{booking_link}"}</code>{" "}
          <code>{"{guide_link}"}</code>. A paragraph containing the guide link is left out when no guide matches
          the enquiry.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bookingLink">Booking link</Label>
        <Input id="bookingLink" name="bookingLink" type="url" defaultValue={settings.bookingLink} className="font-mono text-sm" />
      </div>
      <FormMessage error={state.error} ok={state.ok} />
      <Button type="submit" disabled={pending}>
        <Save data-icon="inline-start" />
        {pending ? "Saving..." : "Save wording"}
      </Button>
    </form>
  );
}

const fileClass =
  "file:mr-3 file:h-full file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium file:text-foreground";

export function AddDocumentForm() {
  const [state, action, pending] = useActionState(addDocumentAction, initial);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-title">Title</Label>
          <Input id="new-title" name="title" required placeholder="Pricing Guide" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-file">PDF</Label>
          <Input id="new-file" name="file" type="file" accept="application/pdf" required className={fileClass} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-description">One line on when to send it</Label>
        <Input id="new-description" name="description" placeholder="For anyone weighing up ongoing support." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-for">Offered for</Label>
        <Input id="new-for" name="for_services" placeholder="New website, Local SEO" />
        <p className="text-xs text-muted-foreground">
          Comma-separated form options or pages. Put <code>*</code> in the list to make it the fallback guide.
          Leave blank to show it in the send list for every enquiry without being the guide.
        </p>
      </div>
      <FormMessage error={state.error} ok={state.ok} />
      <Button type="submit" variant="outline" disabled={pending}>
        <Plus data-icon="inline-start" />
        {pending ? "Uploading..." : "Add document"}
      </Button>
    </form>
  );
}

export function EditDocumentForm({ doc }: { doc: DocumentRow }) {
  const [state, action, pending] = useActionState(updateDocumentAction, initial);
  const [del, delAction, deleting] = useActionState(deleteDocumentAction, initial);
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={doc.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`t-${doc.id}`}>Title</Label>
            <Input id={`t-${doc.id}`} name="title" defaultValue={doc.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`f-${doc.id}`}>Replace PDF</Label>
            <Input id={`f-${doc.id}`} name="file" type="file" accept="application/pdf" className={fileClass} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`d-${doc.id}`}>One line on when to send it</Label>
          <Input id={`d-${doc.id}`} name="description" defaultValue={doc.description ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`s-${doc.id}`}>Offered for</Label>
          <Input id={`s-${doc.id}`} name="for_services" defaultValue={doc.for_services ?? ""} />
        </div>
        <FormMessage error={state.error} ok={state.ok} />
        <Button type="submit" variant="outline" disabled={pending}>
          <Save data-icon="inline-start" />
          {pending ? "Saving..." : "Save"}
        </Button>
      </form>
      <form
        action={delAction}
        onSubmit={(event) => {
          if (!window.confirm(`Remove "${doc.title}" from the shelf? Links already sent will stop working.`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={doc.id} />
        <FormMessage error={del.error} />
        <Button type="submit" variant="ghost" size="sm" disabled={deleting} className="text-destructive hover:text-destructive">
          <Trash2 data-icon="inline-start" />
          Remove from shelf
        </Button>
      </form>
    </div>
  );
}

export function ReviewWordingForm({ settings }: { settings: ReviewSettings }) {
  const [state, action, pending] = useActionState(saveReviewAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="googleUrl">Google review link</Label>
          <Input id="googleUrl" name="googleUrl" type="url" defaultValue={settings.googleUrl} placeholder="https://g.page/r/.../review" className="font-mono text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trustpilotUrl">Trustpilot link</Label>
          <Input id="trustpilotUrl" name="trustpilotUrl" type="url" defaultValue={settings.trustpilotUrl} className="font-mono text-sm" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="review-subject">Subject</Label>
        <Input id="review-subject" name="subject" defaultValue={settings.subject} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="review-body">Email</Label>
        <Textarea id="review-body" name="body" defaultValue={settings.body} rows={12} required className="font-mono text-sm" />
        <p className="text-xs text-muted-foreground">
          Placeholders: <code>{"{first_name}"}</code> <code>{"{business}"}</code> <code>{"{google_link}"}</code>{" "}
          <code>{"{trustpilot_link}"}</code>. A line whose link is blank is left out.
        </p>
      </div>
      <FormMessage error={state.error} ok={state.ok} />
      <Button type="submit" disabled={pending}>
        <Save data-icon="inline-start" />
        {pending ? "Saving..." : "Save wording"}
      </Button>
    </form>
  );
}

function PriceFields({ item }: { item?: PriceItem }) {
  const k = item?.id ?? "new";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_7rem]">
        <div className="space-y-1">
          <Label htmlFor={`pn-${k}`} className="text-xs text-muted-foreground">Name</Label>
          <Input id={`pn-${k}`} name="name" defaultValue={item?.name} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`pk-${k}`} className="text-xs text-muted-foreground">Type</Label>
          <NativeSelect id={`pk-${k}`} name="kind" defaultValue={item?.kind ?? "one_off"}>
            <option value="one_off">One-off</option>
            <option value="monthly">Monthly</option>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`pp-${k}`} className="text-xs text-muted-foreground">Price £</Label>
          <Input id={`pp-${k}`} name="price" inputMode="decimal" defaultValue={item ? (item.price_pence / 100).toString() : ""} required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`pd-${k}`} className="text-xs text-muted-foreground">One line for the quote</Label>
        <Input id={`pd-${k}`} name="description" defaultValue={item?.description ?? ""} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="from_price" defaultChecked={item?.from_price ?? false} className="size-4 accent-[var(--cyan-action)]" />
          &quot;From&quot; price, edited per quote
        </label>
        {item ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={item.active} className="size-4 accent-[var(--cyan-action)]" />
            Shown in the builder
          </label>
        ) : null}
      </div>
    </>
  );
}

export function PriceItemForm({ item }: { item?: PriceItem }) {
  const [state, action, pending] = useActionState(item ? updatePriceItemAction : addPriceItemAction, initial);
  return (
    <form action={action} className="space-y-3">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <PriceFields item={item} />
      <FormMessage error={state.error} ok={state.ok} />
      <Button type="submit" variant="outline" disabled={pending}>
        {item ? <Save data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
        {pending ? "Saving..." : item ? "Save" : "Add item"}
      </Button>
    </form>
  );
}

export function PriceItemRow({ item }: { item: PriceItem }) {
  return (
    <li className={item.active ? "" : "opacity-60"}>
      <details className="rounded-xl border border-border">
        <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 select-none">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-navy">{item.name}</span>
            {item.description ? <span className="block truncate text-xs text-muted-foreground">{item.description}</span> : null}
          </span>
          <span className="shrink-0 text-sm tabular-nums">
            {item.from_price ? "from " : ""}
            {formatPence(item.price_pence)}
            {item.kind === "monthly" ? <span className="text-muted-foreground"> /mo</span> : null}
          </span>
        </summary>
        <div className="border-t border-border p-4">
          <PriceItemForm item={item} />
        </div>
      </details>
    </li>
  );
}

export function QuoteWordingForm({ settings }: { settings: QuoteSettings }) {
  const [state, action, pending] = useActionState(saveQuoteWordingAction, initial);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="q-validDays">Quotes valid for, days</Label>
          <Input id="q-validDays" name="validDays" inputMode="numeric" defaultValue={settings.validDays} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="q-depositPct">Deposit %</Label>
          <Input id="q-depositPct" name="depositPct" inputMode="numeric" defaultValue={settings.depositPct} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="q-subject">Email subject</Label>
        <Input id="q-subject" name="subject" defaultValue={settings.subject} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="q-body">Covering email</Label>
        <Textarea id="q-body" name="body" defaultValue={settings.body} rows={12} required className="font-mono text-sm" />
        <p className="text-xs text-muted-foreground">
          Placeholders: <code>{"{first_name}"}</code> <code>{"{quote_number}"}</code> <code>{"{total}"}</code>{" "}
          <code>{"{summary}"}</code> <code>{"{valid_until}"}</code> <code>{"{quote_link}"}</code>.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="q-notIncluded">Not included, default for new quotes</Label>
        <Textarea id="q-notIncluded" name="notIncluded" defaultValue={settings.notIncluded} rows={4} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="q-paymentNote">Payment wording on the PDF</Label>
        <Textarea id="q-paymentNote" name="paymentNote" defaultValue={settings.paymentNote} rows={3} />
        <p className="text-xs text-muted-foreground">
          Placeholders: <code>{"{deposit}"}</code> <code>{"{balance}"}</code>.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="q-nextStep">Next step on the PDF</Label>
        <Textarea id="q-nextStep" name="nextStep" defaultValue={settings.nextStep} rows={3} />
      </div>
      <FormMessage error={state.error} ok={state.ok} />
      <Button type="submit" disabled={pending}>
        <Save data-icon="inline-start" />
        {pending ? "Saving..." : "Save quote wording"}
      </Button>
    </form>
  );
}
