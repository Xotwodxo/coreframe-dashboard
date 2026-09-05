import type { DocumentRow, Enquiry, ReplySettings } from "@/lib/types";

/**
 * Builds the first reply to an enquiry from the wording Charlie keeps in
 * Settings, the enquiry itself, and the document shelf.
 *
 * Placeholders in the wording: {first_name} {service} {booking_link}
 * {guide_link}. A paragraph containing {guide_link} is dropped entirely when
 * no guide matches, so the email never says "this covers the basics:" with
 * nothing underneath.
 */

export const DOCUMENTS_BUCKET = "documents";

export function documentUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${DOCUMENTS_BUCKET}/${path}`;
}

function tags(doc: DocumentRow): string[] {
  return (doc.for_services ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

/** Documents relevant to this enquiry, most specific first. */
export function documentsFor(enquiry: Enquiry, documents: DocumentRow[]): DocumentRow[] {
  const service = enquiry.service_interest?.trim().toLowerCase() ?? "";
  const page = enquiry.page?.trim().toLowerCase() ?? "";
  const matched = documents.filter((doc) => {
    const t = tags(doc);
    return (service && t.includes(service)) || (page && t.includes(page));
  });
  if (matched.length > 0) return matched;
  return documents.filter((doc) => tags(doc).includes("*"));
}

export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  // "Charlie Brown (end to end test)" should not greet "(end".
  return first.replace(/[^\p{L}\p{M}'-]/gu, "") || "there";
}

/**
 * Turns what the form's dropdown said into something that reads after
 * "Thanks for getting in touch about ...". Covers both site forms; anything
 * unrecognised is used as typed, lower-cased.
 */
export function servicePhrase(serviceInterest: string | null): string {
  const raw = serviceInterest?.trim() ?? "";
  const key = raw.toLowerCase();
  if (!raw || key.includes("not sure")) return "your website";
  if (key.includes("rebuild") || key.includes("replacement") || key.includes("improve")) return "improving your website";
  if (key.includes("ongoing")) return "a website with ongoing support";
  if (key.includes("new website")) return "a new website";
  if (key.includes("seo")) return "local SEO";
  if (key.includes("automation")) return "workflow automation";
  return raw.replace(/^./, (c) => c.toLowerCase());
}

export function buildReply(enquiry: Enquiry, settings: ReplySettings, documents: DocumentRow[]) {
  const guide = documentsFor(enquiry, documents)[0] ?? null;
  const service = servicePhrase(enquiry.service_interest);

  const fill = (text: string) =>
    text
      .replaceAll("{first_name}", firstName(enquiry.name))
      .replaceAll("{service}", service)
      .replaceAll("{booking_link}", settings.bookingLink);

  const paragraphs = settings.body
    .split(/\n\s*\n/)
    .filter((paragraph) => guide || !paragraph.includes("{guide_link}"))
    .map((paragraph) => fill(paragraph).replaceAll("{guide_link}", guide ? documentUrl(guide.storage_path) : ""));

  const subject = fill(settings.subject);
  const body = paragraphs.join("\n\n");
  const mailto = enquiry.email
    ? `mailto:${enquiry.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;

  return { subject, body, mailto, guide };
}

export const DEFAULT_REPLY: ReplySettings = {
  subject: "Your enquiry to Coreframe Digital",
  body: "Hi {first_name},\n\nThanks for getting in touch about {service}.\n\n{booking_link}\n\n{guide_link}\n\nCharlie",
  bookingLink: "https://calendar.app.google/fnoabpMSScgeojgu5",
};
