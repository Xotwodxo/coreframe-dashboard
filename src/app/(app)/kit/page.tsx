import { ExternalLink } from "lucide-react";

import { CopyButton } from "@/components/ui/copy-button";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/format";
import { PAYMENT_LINKS } from "@/lib/payment-links";
import { getDocuments, getReplySettings } from "@/lib/queries";
import { documentUrl } from "@/lib/reply";

import { AddDocumentForm, EditDocumentForm, ReplyWordingForm } from "./kit-forms";

export const dynamic = "force-dynamic";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{children}</h2>
  );
}

/**
 * The reply kit: the wording Reply uses, the shelf of PDFs it links to, and
 * the payment links. Everything a first response needs, editable from a phone.
 */
export default async function KitPage() {
  const [settings, documents] = await Promise.all([getReplySettings(), getDocuments()]);

  return (
    <>
      <PageHeader
        title="Reply kit"
        description="What Reply sends, and what you can send by hand."
      />

      <SectionTitle>Documents</SectionTitle>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing on the shelf yet.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => {
            const url = documentUrl(doc.storage_path);
            return (
              <li key={doc.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{doc.title}</p>
                    {doc.description ? <p className="text-sm text-muted-foreground">{doc.description}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {doc.for_services ? `Offered for: ${doc.for_services}` : "In every send list"} · updated{" "}
                      {formatDate(doc.updated_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <CopyButton value={url} />
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      Open
                    </a>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-cyan-action select-none">Edit</summary>
                  <div className="mt-3">
                    <EditDocumentForm doc={doc} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-3 rounded-xl border border-border">
        <summary className="cursor-pointer px-4 py-3 font-medium select-none">Add a document</summary>
        <div className="border-t border-border p-4">
          <AddDocumentForm />
        </div>
      </details>

      <SectionTitle>Payment links</SectionTitle>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {PAYMENT_LINKS.map((link) => (
          <li key={link.url} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-navy">{link.label}</p>
              <p className="text-sm text-muted-foreground">{link.price}</p>
            </div>
            <CopyButton value={link.url} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        From the payment collection note, 30 Aug 2026. A link on an enquiry page is prefilled with that person&apos;s
        email. Changing a link is a code change on purpose.
      </p>

      <SectionTitle>Reply wording</SectionTitle>
      <ReplyWordingForm settings={settings} />
    </>
  );
}
