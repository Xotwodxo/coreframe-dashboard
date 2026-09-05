import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isOverdue } from "@/lib/enquiry-status";
import type { Enquiry, EnquiryStatus } from "@/lib/types";

/**
 * Read helpers for server components.
 *
 * All of these go through the RLS-respecting server client, never the service
 * role one. Callers are expected to have already called requireUser().
 *
 * Errors are logged and turned into empty results rather than thrown: a screen
 * that renders "nothing to show" beats a white error page.
 */

function warn(where: string, message: string | undefined) {
  if (message) console.error(`[queries] ${where}: ${message}`);
}

export async function getEnquiries(status?: EnquiryStatus) {
  const supabase = await createClient();
  let query = supabase
    .from("enquiries")
    .select("*")
    .order("received_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  warn("getEnquiries", error?.message);
  return (data ?? []) as Enquiry[];
}

export async function getEnquiry(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  warn("getEnquiry", error?.message);
  return (data ?? null) as Enquiry | null;
}

export interface WaitingEnquiry extends Enquiry {
  /** True when the enquiry has sat at `new` for longer than the reply window. */
  overdue: boolean;
}

/**
 * The Today screen's input: everything still at `new`, with the 24-hour flag
 * already worked out. The clock is read here, in a server helper, rather than
 * in the component, so the render itself stays pure.
 */
export async function getWaitingEnquiries(): Promise<WaitingEnquiry[]> {
  const waiting = await getEnquiries("new");
  const now = Date.now();
  return waiting.map((enquiry) => ({
    ...enquiry,
    overdue: isOverdue(enquiry.received_at, now),
  }));
}
