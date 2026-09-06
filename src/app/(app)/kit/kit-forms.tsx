"use client";

import { useActionState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentRow, ReplySettings, ReviewSettings } from "@/lib/types";

import {
  addDocumentAction,
  deleteDocumentAction,
  saveReplyAction,
  saveReviewAction,
  updateDocumentAction,
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
