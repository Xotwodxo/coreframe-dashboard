"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { STATUS_LABELS, canMove, isEnquiryStatus } from "@/lib/enquiry-status";
import { isLeadSource } from "@/lib/lead-sources";
import { createClient } from "@/lib/supabase/server";
import type { Enquiry } from "@/lib/types";

async function note(enquiryId: string, body: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("enquiry_notes").insert({ enquiry_id: enquiryId, body });
  if (error) console.error("[enquiries] Note failed.", error.message);
}

/**
 * Move an enquiry one step along its lifecycle.
 *
 * The current status is re-read here rather than trusted from the client, so
 * two tabs cannot race each other into a backwards move. Every write also
 * stamps status_changed_at, which is what phase 2's reply nudge keys off.
 */
export async function setEnquiryStatus(id: string, next: unknown) {
  await requireUser();

  if (!isEnquiryStatus(next)) {
    return { error: "That is not a status this system knows." };
  }

  const supabase = await createClient();

  const { data: row, error: readError } = await supabase
    .from("enquiries")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (readError || !row) {
    console.error("[enquiries] Could not read enquiry.", readError?.message);
    return { error: "Could not open that enquiry." };
  }

  const current = (row as Pick<Enquiry, "status">).status;

  if (!canMove(current, next)) {
    return {
      error: `Cannot move from ${STATUS_LABELS[current]} to ${STATUS_LABELS[next]}.`,
    };
  }

  const { error } = await supabase
    .from("enquiries")
    .update({ status: next, status_changed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", current);

  if (error) {
    console.error("[enquiries] Status update failed.", error.message);
    return { error: "Could not update that enquiry. Try again." };
  }

  await note(id, `Marked ${STATUS_LABELS[next].toLowerCase()}`);

  revalidatePath("/");
  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  return { error: null };
}

/**
 * Called when Charlie taps Reply. The mail app opens with the email filled in;
 * this records that a reply went out. A mailto link cannot report whether the
 * email was sent, so tapping counts, by Charlie's decision on 5 Sep 2026.
 */
export async function recordReply(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("enquiries").select("status").eq("id", id).maybeSingle();
  const current = (data as Pick<Enquiry, "status"> | null)?.status;
  if (current === "new") {
    await supabase
      .from("enquiries")
      .update({ status: "replied", status_changed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "new");
    await note(id, "Replied by email from the reply kit");
  } else {
    await note(id, "Sent another email from the reply kit");
  }
  revalidatePath("/");
  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
}

export interface NoteState {
  error: string | null;
}

export async function addNoteAction(_prev: NoteState, formData: FormData): Promise<NoteState> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!id || !body) return { error: "Write something first." };
  await note(id, body);
  revalidatePath(`/enquiries/${id}`);
  return { error: null };
}

/** "1,250" or "£1250.00" to pence. Records when it was quoted for the monthly total. */
export async function setQuotedAction(_prev: NoteState, formData: FormData): Promise<NoteState> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("quoted") ?? "").replace(/[£,\s]/g, "");
  if (!id || raw === "" || !/^\d*\.?\d*$/.test(raw)) return { error: "Enter the amount in pounds." };
  const pence = Math.round(Number(raw) * 100);

  const supabase = await createClient();
  const { error } = await supabase
    .from("enquiries")
    .update({ quoted_pence: pence, quoted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[enquiries] Quote failed.", error.message);
    return { error: "Could not save the quote." };
  }
  await note(id, `Quoted £${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
  revalidatePath("/");
  revalidatePath(`/enquiries/${id}`);
  return { error: null };
}

export interface AddEnquiryState {
  error: string | null;
}

function field(formData: FormData, name: string, limit: number) {
  return String(formData.get(name) ?? "").trim().slice(0, limit);
}

/**
 * Log a lead that did not come through the website form: a Facebook group
 * reply, a Bark request, a call, a referral. It lands at `new` like any other
 * enquiry so it gets the same reply kit and the same speed-to-lead clock.
 *
 * nudge_sent_at is stamped straight away: Charlie is looking at this lead as
 * he logs it, so a Telegram nudge about it would only be noise.
 */
export async function addEnquiryAction(
  _prev: AddEnquiryState,
  formData: FormData
): Promise<AddEnquiryState> {
  await requireUser();

  const name = field(formData, "name", 100);
  if (!name) return { error: "Add a name, even just a first name." };

  const source = formData.get("lead_source");
  if (!isLeadSource(source)) return { error: "Pick where the lead came from." };

  // datetime-local has no zone, so the browser sends its offset alongside.
  const when = field(formData, "received_at", 20);
  const offset = Number(formData.get("tz_offset") ?? 0);
  let receivedAt = new Date().toISOString();
  if (when) {
    const utc = Date.parse(`${when}:00Z`);
    if (Number.isNaN(utc) || !Number.isFinite(offset)) return { error: "That date is not valid." };
    const stamp = utc + offset * 60000;
    if (stamp > Date.now() + 5 * 60000) return { error: "That date is in the future." };
    receivedAt = new Date(stamp).toISOString();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      source: "coreframe",
      lead_source: source,
      received_at: receivedAt,
      nudge_sent_at: new Date().toISOString(),
      name,
      business_name: field(formData, "business_name", 120) || null,
      phone: field(formData, "phone", 40) || null,
      email: field(formData, "email", 254) || null,
      message: field(formData, "message", 3000) || null,
      page: "Logged by hand",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[enquiries] Manual add failed.", error?.message);
    return { error: "Could not save that lead. Try again." };
  }

  await note(data.id, `Logged by hand from ${source}`);
  revalidatePath("/");
  revalidatePath("/enquiries");
  redirect(`/enquiries/${data.id}`);
}

/** Called when Charlie taps Ask for a review on a won enquiry. Recorded as a note. */
export async function recordEnquiryReviewAsk(id: string) {
  await requireUser();
  await note(id, "Asked for a review by email");
  revalidatePath(`/enquiries/${id}`);
}
