/**
 * Domain shapes, mirroring supabase/migrations/*.sql by hand.
 *
 * The migrations are the source of truth. Keep this file in step with them.
 */

export type EnquiryStatus = "new" | "replied" | "quoted" | "won" | "lost";

export interface Enquiry {
  id: string;
  /** "coreframe" for the marketing site. Phase 3 adds "client_site". */
  source: string;
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

export type Tier =
  | "essential"
  | "managed"
  | "growth"
  | "workflow"
  | "local_visibility"
  | "friend";

/** "pending" is agreed but not yet billing, such as Evans's free period. */
export type PlanStatus = "pending" | "active" | "past_due" | "paused" | "cancelled";

export interface Client {
  id: string;
  slug: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  domain: string | null;
  tier: Tier;
  plan_status: PlanStatus;
  renews_on: string | null;
  price_pence: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  /** Null means no time allowance at all. */
  allowance_minutes: number | null;
  allowance_cap_minutes: number | null;
  notes: string | null;
  /** Path inside the public client-logos bucket, or null for the initials mark. */
  logo_path: string | null;
  created_at: string;
}

export type LedgerType = "credit" | "debit" | "cap_expire";

export interface LedgerEntry {
  id: string;
  seq: number;
  client_id: string;
  occurred_at: string;
  type: LedgerType;
  /** Magnitude. The type gives the direction. */
  minutes: number;
  balance_after: number;
  ref_type: "invoice" | "request" | "manual" | null;
  ref_id: string | null;
  note: string | null;
}

export type RequestStatus = "new" | "scheduled" | "done";

export interface ChangeRequest {
  id: string;
  client_id: string;
  created_at: string;
  description: string;
  status: RequestStatus;
  scheduled_for: string | null;
  done_at: string | null;
  minutes_spent: number | null;
}
