/**
 * Domain shapes, mirroring supabase/migrations/*.sql by hand.
 *
 * The migrations are the source of truth. Keep this file in step with them.
 */

export type EnquiryStatus = "new" | "replied" | "quoted" | "won" | "lost";

export interface Enquiry {
  id: string;
  /** "coreframe" for the marketing site. Phase 2 adds "client_site". */
  source: string;
  /** Null until phase 2 adds the clients table. */
  client_id: string | null;
  received_at: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  /** The page the form was on, e.g. "/contact" or "/start". */
  page: string | null;
  service_interest: string | null;
  business_name: string | null;
  budget: string | null;
  timing: string | null;
  status: EnquiryStatus;
  status_changed_at: string | null;
  nudge_sent_at: string | null;
}
