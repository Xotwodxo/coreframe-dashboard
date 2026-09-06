"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { STATUS_LABELS, canMove, isEnquiryStatus } from "@/lib/enquiry-status";
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

/** Called when Charlie taps Ask for a review on a won enquiry. Recorded as a note. */
export async function recordEnquiryReviewAsk(id: string) {
  await requireUser();
  await note(id, "Asked for a review by email");
  revalidatePath(`/enquiries/${id}`);
}
