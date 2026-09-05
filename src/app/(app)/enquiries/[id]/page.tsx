import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, formatPence, telHref } from "@/lib/format";
import { PAYMENT_LINKS, paymentLinkFor } from "@/lib/payment-links";
import { getDocuments, getEnquiry, getEnquiryNotes, getReplySettings } from "@/lib/queries";
import { buildReply, documentUrl, documentsFor } from "@/lib/reply";
import { cn } from "@/lib/utils";

import { EnquiryActions } from "./enquiry-actions";
import { NoteForm, QuotedForm, ReplyButton, SendList, type SendItem } from "./reply-kit";

export const dynamic = "force-dynamic";

/** Only render the rows the visitor actually answered. */
function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{children}</h2>
  );
}

export default async function EnquiryPage({ params }: PageProps<"/enquiries/[id]">) {
  const { id } = await params;
  const enquiry = await getEnquiry(id);
  if (!enquiry) notFound();

  const [notes, documents, settings] = await Promise.all([
    getEnquiryNotes(id),
    getDocuments(),
    getReplySettings(),
  ]);

  const reply = buildReply(enquiry, settings, documents);
  const relevant = documentsFor(enquiry, documents);
  const service = enquiry.service_interest?.trim() ?? "";

  const sendItems: SendItem[] = [
    ...relevant.map((doc) => ({
      label: doc.title,
      detail: doc.description,
      url: documentUrl(doc.storage_path),
      primary: reply.guide?.id === doc.id,
    })),
    ...PAYMENT_LINKS.filter((link) => link.forServices.includes(service)).map((link) => ({
      label: `${link.label} payment link`,
      detail: `${link.price}, prefilled with their email`,
      url: paymentLinkFor(link, enquiry.email),
    })),
  ];
  const everythingElse: SendItem[] = [
    ...documents
      .filter((doc) => !relevant.some((r) => r.id === doc.id))
      .map((doc) => ({ label: doc.title, detail: doc.description, url: documentUrl(doc.storage_path) })),
    ...PAYMENT_LINKS.filter((link) => !link.forServices.includes(service)).map((link) => ({
      label: `${link.label} payment link`,
      detail: link.price,
      url: paymentLinkFor(link, enquiry.email),
    })),
  ];

  return (
    <>
      <Link href="/enquiries" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Enquiries
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{enquiry.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {enquiry.business_name ? `${enquiry.business_name} · ` : null}
            Received {formatDateTime(enquiry.received_at)}
            {enquiry.quoted_pence !== null ? ` · quoted ${formatPence(enquiry.quoted_pence)}` : ""}
          </p>
        </div>
        <StatusBadge status={enquiry.status} />
      </div>

      {/* Replying is the job. The reply is the biggest target; call and plain email sit beside it. */}
      <ReplyButton id={enquiry.id} mailto={reply.mailto} isNew={enquiry.status === "new"} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ContactButton href={enquiry.phone ? telHref(enquiry.phone) : null} icon={Phone} label="Call" />
        <ContactButton href={enquiry.email ? `mailto:${enquiry.email}` : null} icon={Mail} label="Blank email" />
      </div>

      <dl className="mt-6 divide-y divide-border">
        <Detail label="Phone" value={enquiry.phone} />
        <Detail label="Email" value={enquiry.email} />
        <Detail label="Business" value={enquiry.business_name} />
        <Detail label="Looking for" value={enquiry.service_interest} />
        <Detail label="Budget" value={enquiry.budget} />
        <Detail label="Timing" value={enquiry.timing} />
        <Detail label="Sent from" value={enquiry.page} />
      </dl>

      {enquiry.message ? (
        <>
          <SectionTitle>Their message</SectionTitle>
          <p className="rounded-xl border border-border p-4 text-sm whitespace-pre-wrap">{enquiry.message}</p>
        </>
      ) : null}

      <SectionTitle>Send them something</SectionTitle>
      <SendList items={sendItems} />
      {everythingElse.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-cyan-action select-none">Everything else on the shelf</summary>
          <div className="mt-2">
            <SendList items={everythingElse} />
          </div>
        </details>
      ) : null}

      {enquiry.status !== "new" ? (
        <>
          <SectionTitle>Quote</SectionTitle>
          <QuotedForm id={enquiry.id} current={enquiry.quoted_pence} />
        </>
      ) : null}

      <SectionTitle>Notes</SectionTitle>
      <NoteForm id={enquiry.id} />
      {notes.length > 0 ? (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {notes.map((note) => (
            <li key={note.id} className="px-4 py-3">
              <p className="text-sm whitespace-pre-wrap">{note.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(note.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <Separator className="my-6" />

      <EnquiryActions id={enquiry.id} status={enquiry.status} />
    </>
  );
}

function ContactButton({ href, icon: Icon, label }: { href: string | null; icon: typeof Phone; label: string }) {
  const className = cn(
    "flex h-12 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium transition-colors hover:bg-muted",
    !href && "pointer-events-none opacity-40"
  );
  if (!href) {
    return (
      <span className={className} aria-disabled title={`No ${label.toLowerCase()} given`}>
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
    );
  }
  return (
    <a href={href} className={className}>
      <Icon className="size-4" aria-hidden />
      {label}
    </a>
  );
}
