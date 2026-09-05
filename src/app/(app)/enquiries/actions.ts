"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { STATUS_LABELS, canMove, isEnquiryStatus } from "@/lib/enquiry-status";
import { createClient } from "@/lib/supabase/server";
import type { Enquiry } from "@/lib/types";

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

  revalidatePath("/");
  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  return { error: null };
}
