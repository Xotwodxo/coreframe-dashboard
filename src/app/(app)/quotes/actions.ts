"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { formatPence } from "@/lib/format";
import { renderAndStoreQuote, signedQuoteUrl } from "@/lib/quote-pdf";
import { buildQuoteEmail, summarise, totals } from "@/lib/quotes";
import { createClient } from "@/lib/supabase/server";
import type { Client, Enquiry, PriceKind, Quote, QuoteLine, QuoteSettings } from "@/lib/types";

export interface QuoteState {
  error: string | null;
  ok?: string | null;
}

async function settings(supabase: Awaited<ReturnType<typeof createClient>>): Promise<QuoteSettings> {
  const { data } = await supabase.from("settings").select("value").eq("key", "quote").maybeSingle();
  const { DEFAULT_QUOTE_SETTINGS } = await import("@/lib/quotes");
  return { ...DEFAULT_QUOTE_SETTINGS, ...((data as { value: Partial<QuoteSettings> } | null)?.value ?? {}) };
}

async function note(enquiryId: string | null, body: string) {
  if (!enquiryId) return;
  const supabase = await createClient();
  await supabase.from("enquiry_notes").insert({ enquiry_id: enquiryId, body });
}

/** Starts a draft for an enquiry or a client and opens it. */
export async function createQuoteAction(ref: { enquiryId?: string; clientId?: string }) {
  await requireUser();
  const supabase = await createClient();
  const conf = await settings(supabase);

  let to: { name: string; business: string | null; email: string | null; title: string };
  if (ref.enquiryId) {
    const { data } = await supabase.from("enquiries").select("*").eq("id", ref.enquiryId).maybeSingle();
    const e = data as Enquiry | null;
    if (!e) return;
    to = {
      name: e.name,
      business: e.business_name,
      email: e.email,
      title: e.service_interest ? `${e.service_interest} for ${e.business_name || e.name}` : `Quote for ${e.business_name || e.name}`,
    };
  } else if (ref.clientId) {
    const { data } = await supabase.from("clients").select("*").eq("id", ref.clientId).maybeSingle();
    const c = data as Client | null;
    if (!c) return;
    to = { name: c.contact_name || c.name, business: c.name, email: c.contact_email, title: `Additional work for ${c.name}` };
  } else {
    return;
  }

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      enquiry_id: ref.enquiryId ?? null,
      client_id: ref.clientId ?? null,
      to_name: to.name,
      to_business: to.business,
      to_email: to.email,
      title: to.title,
      not_included: conf.notIncluded,
      deposit_pct: conf.depositPct,
      valid_days: conf.validDays,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[quotes] Create failed.", error?.message);
    return;
  }
  const id = (data as { id: string }).id;
  await note(ref.enquiryId ?? null, "Started a quote");
  if (ref.enquiryId) revalidatePath(`/enquiries/${ref.enquiryId}`);
  if (ref.clientId) revalidatePath(`/clients/${ref.clientId}`);
  redirect(`/quotes/${id}`);
}

function parseLines(raw: unknown): QuoteLine[] | null {
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > 40) return null;
  const lines: QuoteLine[] = [];
  for (const item of parsed as Record<string, unknown>[]) {
    const description = typeof item.description === "string" ? item.description.trim().slice(0, 200) : "";
    const kind = item.kind === "monthly" ? "monthly" : ("one_off" as PriceKind);
    const unit = Number(item.unit_pence);
    const quantity = Number(item.quantity);
    if (!description || !Number.isInteger(unit) || unit < 0 || !Number.isFinite(quantity) || quantity <= 0) return null;
    lines.push({ description, kind, unit_pence: unit, quantity: Math.round(quantity * 100) / 100 });
  }
  return lines;
}

function text(formData: FormData, key: string, max: number): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

export async function saveQuoteAction(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  await requireUser();
  const id = text(formData, "id", 40);
  const title = text(formData, "title", 160);
  const toName = text(formData, "to_name", 120);
  const lines = parseLines(formData.get("lines"));
  const depositPct = Number(text(formData, "deposit_pct", 5));
  const validDays = Number(text(formData, "valid_days", 5));
  if (!id || !title || !toName) return { error: "A title and a name are needed." };
  if (!lines) return { error: "One of the lines is not valid." };
  if (!Number.isInteger(depositPct) || depositPct < 0 || depositPct > 100) return { error: "Deposit must be a whole percentage." };
  if (!Number.isInteger(validDays) || validDays < 1 || validDays > 90) return { error: "Validity must be between 1 and 90 days." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({
      title,
      to_name: toName,
      to_business: text(formData, "to_business", 120) || null,
      to_email: text(formData, "to_email", 254) || null,
      intro: text(formData, "intro", 3000) || null,
      lines,
      not_included: text(formData, "not_included", 3000) || null,
      timeline: text(formData, "timeline", 2000) || null,
      deposit_pct: depositPct,
      valid_days: validDays,
    })
    .eq("id", id)
    .eq("status", "draft");
  if (error) {
    console.error("[quotes] Save failed.", error.message);
    return { error: "Could not save the quote." };
  }
  revalidatePath(`/quotes/${id}`);
  return { error: null, ok: "Saved." };
}

/**
 * Sends the quote. Renders the PDF, stores it, and either emails it with the
 * PDF attached (when Resend is configured on this app) or hands back a
 * mailto link carrying the signed PDF link for the phone's mail app.
 * Either way the quote is marked sent, the enquiry quoted, and the amount
 * recorded, because the tap is the decision.
 */
export async function sendQuoteAction(
  _prev: QuoteState & { mailto?: string | null },
  formData: FormData
): Promise<QuoteState & { mailto?: string | null }> {
  await requireUser();
  const id = text(formData, "id", 40);
  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  const quote = data as Quote | null;
  if (!quote) return { error: "That quote no longer exists." };
  if (quote.lines.length === 0) return { error: "Add at least one line before sending." };
  if (!quote.to_email) return { error: "There is no email address to send it to." };

  const conf = await settings(supabase);
  const sentAt = new Date().toISOString();
  const forRender: Quote = { ...quote, sent_at: sentAt, status: "sent" };

  let pdfPath: string;
  try {
    pdfPath = await renderAndStoreQuote(supabase, forRender, conf);
  } catch (error) {
    console.error("[quotes] Render failed.", error);
    return { error: "Could not build the PDF." };
  }

  const link = (await signedQuoteUrl(supabase, pdfPath)) ?? "";
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const canAttach = Boolean(apiKey && from);
  const email = buildQuoteEmail(forRender, conf, link, { attached: canAttach });

  let delivered = false;
  if (apiKey && from) {
    const { data: file } = await supabase.storage.from("quotes").download(pdfPath);
    const content = file ? Buffer.from(await file.arrayBuffer()).toString("base64") : null;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from.includes("<") ? from : `Coreframe Digital <${from}>`,
          to: [quote.to_email],
          reply_to: process.env.RESEND_REPLY_TO || undefined,
          subject: email.subject,
          text: email.body,
          attachments: content ? [{ filename: `${quote.number}.pdf`, content }] : undefined,
        }),
      });
      delivered = res.ok;
      if (!res.ok) console.error("[quotes] Resend rejected the email.", res.status);
    } catch (error) {
      console.error("[quotes] Resend unreachable.", error);
    }
  }

  const { oneOff } = totals(quote.lines);
  await supabase.from("quotes").update({ status: "sent", sent_at: sentAt, pdf_path: pdfPath }).eq("id", id);

  if (quote.enquiry_id) {
    const { data: e } = await supabase.from("enquiries").select("status").eq("id", quote.enquiry_id).maybeSingle();
    const current = (e as Pick<Enquiry, "status"> | null)?.status;
    const patch: Record<string, unknown> = { quoted_pence: oneOff, quoted_at: sentAt };
    if (current === "new" || current === "replied") {
      patch.status = "quoted";
      patch.status_changed_at = sentAt;
    }
    await supabase.from("enquiries").update(patch).eq("id", quote.enquiry_id);
    await note(quote.enquiry_id, `Sent quote ${quote.number}: ${summarise(quote.lines)}${delivered ? "" : " (opened in Mail)"}`);
    revalidatePath(`/enquiries/${quote.enquiry_id}`);
  }
  if (quote.client_id) revalidatePath(`/clients/${quote.client_id}`);
  revalidatePath("/");
  revalidatePath(`/quotes/${id}`);

  return delivered
    ? { error: null, ok: `Sent to ${quote.to_email} with the PDF attached.` }
    : { error: null, ok: "PDF ready. Your mail app should have opened with the link.", mailto: email.mailto };
}

export async function decideQuoteAction(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  await requireUser();
  const id = text(formData, "id", 40);
  const decision = text(formData, "decision", 10);
  const closeEnquiry = formData.get("close_enquiry") === "on";
  if (!id || (decision !== "accepted" && decision !== "declined")) return { error: "Choose accepted or declined." };

  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  const quote = data as Quote | null;
  if (!quote) return { error: "That quote no longer exists." };

  const now = new Date().toISOString();
  const { error } = await supabase.from("quotes").update({ status: decision, decided_at: now }).eq("id", id);
  if (error) return { error: "Could not record the decision." };

  if (quote.enquiry_id) {
    const { oneOff } = totals(quote.lines);
    if (decision === "accepted") {
      await supabase
        .from("enquiries")
        .update({ status: "won", status_changed_at: now, quoted_pence: oneOff })
        .eq("id", quote.enquiry_id)
        .neq("status", "won");
      await note(quote.enquiry_id, `Quote ${quote.number} accepted, ${formatPence(oneOff)}. Marked won`);
    } else {
      if (closeEnquiry) {
        await supabase
          .from("enquiries")
          .update({ status: "lost", status_changed_at: now })
          .eq("id", quote.enquiry_id)
          .not("status", "in", "(won,lost)");
      }
      await note(quote.enquiry_id, `Quote ${quote.number} declined${closeEnquiry ? ". Marked lost" : ""}`);
    }
    revalidatePath(`/enquiries/${quote.enquiry_id}`);
  }
  if (quote.client_id) revalidatePath(`/clients/${quote.client_id}`);
  revalidatePath("/");
  revalidatePath(`/quotes/${id}`);
  return { error: null, ok: decision === "accepted" ? "Accepted." : "Declined." };
}

/** Back to draft so it can be edited and sent again. Keeps the number. */
export async function reopenQuoteAction(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  await requireUser();
  const id = text(formData, "id", 40);
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update({ status: "draft", decided_at: null }).eq("id", id);
  if (error) return { error: "Could not reopen it." };
  revalidatePath(`/quotes/${id}`);
  return { error: null, ok: "Back to draft." };
}

export async function deleteDraftAction(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  await requireUser();
  const id = text(formData, "id", 40);
  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("enquiry_id, client_id, status").eq("id", id).maybeSingle();
  const q = data as Pick<Quote, "enquiry_id" | "client_id" | "status"> | null;
  if (!q || q.status !== "draft") return { error: "Only drafts can be deleted." };
  await supabase.from("quotes").delete().eq("id", id);
  if (q.enquiry_id) {
    revalidatePath(`/enquiries/${q.enquiry_id}`);
    redirect(`/enquiries/${q.enquiry_id}`);
  }
  if (q.client_id) {
    revalidatePath(`/clients/${q.client_id}`);
    redirect(`/clients/${q.client_id}`);
  }
  redirect("/enquiries");
}

/** A fresh 30-day link for a sent quote. */
export async function freshQuoteLink(id: string): Promise<string | null> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("quotes").select("pdf_path").eq("id", id).maybeSingle();
  const path = (data as { pdf_path: string | null } | null)?.pdf_path;
  if (!path) return null;
  return signedQuoteUrl(supabase, path);
}
