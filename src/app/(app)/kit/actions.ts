"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { DOCUMENTS_BUCKET } from "@/lib/reply";
import { createClient } from "@/lib/supabase/server";

export interface KitState {
  error: string | null;
  ok?: string | null;
}

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function text(formData: FormData, key: string, max: number): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uploadPdf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
  file: File
): Promise<{ path?: string; error?: string }> {
  if (file.type !== "application/pdf") return { error: "Documents must be PDFs." };
  if (file.size > MAX_PDF_BYTES) return { error: "PDFs must be under 10 MB." };
  const path = `${slug}/${slug}-${Date.now()}.pdf`;
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) {
    console.error("[kit] Upload failed.", error.message);
    return { error: "Could not upload the file." };
  }
  return { path };
}

export async function saveReplyAction(_prev: KitState, formData: FormData): Promise<KitState> {
  await requireUser();
  const subject = text(formData, "subject", 200);
  const body = text(formData, "body", 5000);
  const bookingLink = text(formData, "bookingLink", 500);
  if (!subject || !body) return { error: "Subject and body are both needed." };
  if (bookingLink && !/^https:\/\//.test(bookingLink)) return { error: "The booking link must start with https://." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "reply", value: { subject, body, bookingLink }, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[kit] Save reply failed.", error.message);
    return { error: "Could not save the wording." };
  }
  revalidatePath("/kit");
  revalidatePath("/enquiries", "layout");
  return { error: null, ok: "Saved." };
}

export async function saveReviewAction(_prev: KitState, formData: FormData): Promise<KitState> {
  await requireUser();
  const subject = text(formData, "subject", 200);
  const body = text(formData, "body", 5000);
  const googleUrl = text(formData, "googleUrl", 500);
  const trustpilotUrl = text(formData, "trustpilotUrl", 500);
  if (!subject || !body) return { error: "Subject and body are both needed." };
  for (const url of [googleUrl, trustpilotUrl]) {
    if (url && !/^https:\/\//.test(url)) return { error: "Links must start with https://." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "review", value: { subject, body, googleUrl, trustpilotUrl }, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[kit] Save review failed.", error.message);
    return { error: "Could not save the wording." };
  }
  revalidatePath("/kit");
  revalidatePath("/clients", "layout");
  revalidatePath("/enquiries", "layout");
  return { error: null, ok: "Saved." };
}

export async function addDocumentAction(_prev: KitState, formData: FormData): Promise<KitState> {
  await requireUser();
  const title = text(formData, "title", 120);
  const description = text(formData, "description", 500);
  const forServices = text(formData, "for_services", 300);
  const file = formData.get("file");
  if (!title) return { error: "Give it a title." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF." };

  const supabase = await createClient();
  const slug = slugify(title);
  const upload = await uploadPdf(supabase, slug, file);
  if (upload.error || !upload.path) return { error: upload.error ?? "Upload failed." };

  const { data: last } = await supabase
    .from("documents")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((last as { sort_order: number } | null)?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("documents").insert({
    slug,
    title,
    description: description || null,
    storage_path: upload.path,
    for_services: forServices || null,
    sort_order: sortOrder,
  });
  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([upload.path]);
    console.error("[kit] Add document failed.", error.message);
    return { error: error.code === "23505" ? "A document with that title already exists." : "Could not save the document." };
  }
  revalidatePath("/kit");
  return { error: null, ok: "Added." };
}

export async function updateDocumentAction(_prev: KitState, formData: FormData): Promise<KitState> {
  await requireUser();
  const id = text(formData, "id", 40);
  const title = text(formData, "title", 120);
  const description = text(formData, "description", 500);
  const forServices = text(formData, "for_services", 300);
  if (!id || !title) return { error: "Give it a title." };

  const supabase = await createClient();
  const { data: current } = await supabase.from("documents").select("slug, storage_path").eq("id", id).maybeSingle();
  if (!current) return { error: "That document no longer exists." };
  const row = current as { slug: string; storage_path: string };

  const patch: Record<string, unknown> = {
    title,
    description: description || null,
    for_services: forServices || null,
    updated_at: new Date().toISOString(),
  };

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const upload = await uploadPdf(supabase, row.slug, file);
    if (upload.error || !upload.path) return { error: upload.error ?? "Upload failed." };
    patch.storage_path = upload.path;
  }

  const { error } = await supabase.from("documents").update(patch).eq("id", id);
  if (error) {
    console.error("[kit] Update document failed.", error.message);
    return { error: "Could not save the changes." };
  }
  if (patch.storage_path && patch.storage_path !== row.storage_path) {
    // Links already sent point at the old file. Keep it. Storage is cheap;
    // a dead link in a lead's inbox is not.
  }
  revalidatePath("/kit");
  return { error: null, ok: "Saved." };
}

export async function deleteDocumentAction(_prev: KitState, formData: FormData): Promise<KitState> {
  await requireUser();
  const id = text(formData, "id", 40);
  if (!id) return { error: "Missing document." };
  const supabase = await createClient();
  const { data: current } = await supabase.from("documents").select("storage_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) {
    console.error("[kit] Delete document failed.", error.message);
    return { error: "Could not remove it." };
  }
  const path = (current as { storage_path: string } | null)?.storage_path;
  if (path) await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
  revalidatePath("/kit");
  return { error: null, ok: "Removed." };
}

// ---------------------------------------------------------------------------
// Price list and quote wording
// ---------------------------------------------------------------------------

function pounds(formData: FormData, key: string): number | null {
  const raw = text(formData, key, 20).replace(/[£,\s]/g, "");
  if (raw === "" || !/^\d*\.?\d*$/.test(raw)) return null;
  return Math.round(Number(raw) * 100);
}

type ParsedPrice =
  | { error: string; row?: undefined }
  | {
      error?: undefined;
      row: { name: string; description: string | null; kind: "one_off" | "monthly"; price_pence: number; from_price: boolean; active: boolean };
    };

function readPriceItem(formData: FormData): ParsedPrice {
  const name = text(formData, "name", 120);
  const kind = text(formData, "kind", 10);
  const price = pounds(formData, "price");
  if (!name) return { error: "Give it a name." };
  if (kind !== "one_off" && kind !== "monthly") return { error: "Pick one-off or monthly." };
  if (price === null) return { error: "Enter the price in pounds." };
  return {
    row: {
      name,
      description: text(formData, "description", 300) || null,
      kind,
      price_pence: price,
      from_price: formData.get("from_price") === "on",
      active: formData.get("active") !== "off",
    },
  };
}

export async function addPriceItemAction(_prev: KitState, formData: FormData): Promise<KitState> {
  await requireUser();
  const parsed = readPriceItem(formData);
  if (parsed.error !== undefined) return { error: parsed.error };
  const supabase = await createClient();
  const { data: last } = await supabase.from("price_items").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sortOrder = ((last as { sort_order: number } | null)?.sort_order ?? 0) + 10;
  const { error } = await supabase.from("price_items").insert({ ...parsed.row, sort_order: sortOrder });
  if (error) {
    console.error("[kit] Add price item failed.", error.message);
    return { error: "Could not add it." };
  }
  revalidatePath("/kit");
  return { error: null, ok: "Added." };
}

export async function updatePriceItemAction(_prev: KitState, formData: FormData): Promise<KitState> {
  await requireUser();
  const id = text(formData, "id", 40);
  const parsed = readPriceItem(formData);
  if (!id) return { error: "Missing item." };
  if (parsed.error !== undefined) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("price_items").update({ ...parsed.row, active: formData.get("active") === "on" }).eq("id", id);
  if (error) {
    console.error("[kit] Update price item failed.", error.message);
    return { error: "Could not save it." };
  }
  revalidatePath("/kit");
  return { error: null, ok: "Saved." };
}

export async function saveQuoteWordingAction(_prev: KitState, formData: FormData): Promise<KitState> {
  await requireUser();
  const subject = text(formData, "subject", 200);
  const body = text(formData, "body", 5000);
  const notIncluded = text(formData, "notIncluded", 3000);
  const paymentNote = text(formData, "paymentNote", 2000);
  const nextStep = text(formData, "nextStep", 2000);
  const validDays = Number(text(formData, "validDays", 5));
  const depositPct = Number(text(formData, "depositPct", 5));
  if (!subject || !body) return { error: "Subject and body are both needed." };
  if (!Number.isInteger(validDays) || validDays < 1 || validDays > 90) return { error: "Validity must be 1 to 90 days." };
  if (!Number.isInteger(depositPct) || depositPct < 0 || depositPct > 100) return { error: "Deposit must be a whole percentage." };

  const supabase = await createClient();
  const { error } = await supabase.from("settings").upsert({
    key: "quote",
    value: { subject, body, notIncluded, paymentNote, nextStep, validDays, depositPct },
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[kit] Save quote wording failed.", error.message);
    return { error: "Could not save the wording." };
  }
  revalidatePath("/kit");
  return { error: null, ok: "Saved." };
}
