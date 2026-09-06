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
  /** What was quoted, in pence. Null until a quote is recorded. */
  quoted_pence: number | null;
  quoted_at: string | null;
}

export interface EnquiryNote {
  id: string;
  enquiry_id: string;
  created_at: string;
  body: string;
}

export interface DocumentRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  storage_path: string;
  /** Comma-separated service options or pages this is offered for. "*" marks the default guide. */
  for_services: string | null;
  sort_order: number;
  updated_at: string;
}

export interface ReplySettings {
  subject: string;
  body: string;
  bookingLink: string;
}

export interface ReviewSettings {
  subject: string;
  body: string;
  googleUrl: string;
  trustpilotUrl: string;
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
  /** When Charlie last asked them for a review. */
  review_requested_at: string | null;
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

export type PriceKind = "one_off" | "monthly";

export interface PriceItem {
  id: string;
  name: string;
  description: string | null;
  kind: PriceKind;
  price_pence: number;
  /** "from" pricing: the line is expected to be edited to the real figure. */
  from_price: boolean;
  active: boolean;
  sort_order: number;
}

export interface QuoteLine {
  description: string;
  kind: PriceKind;
  unit_pence: number;
  quantity: number;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

export interface Quote {
  id: string;
  number: string;
  enquiry_id: string | null;
  client_id: string | null;
  to_name: string;
  to_business: string | null;
  to_email: string | null;
  title: string;
  intro: string | null;
  lines: QuoteLine[];
  not_included: string | null;
  timeline: string | null;
  deposit_pct: number;
  valid_days: number;
  status: QuoteStatus;
  sent_at: string | null;
  decided_at: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteSettings {
  subject: string;
  body: string;
  notIncluded: string;
  paymentNote: string;
  nextStep: string;
  validDays: number;
  depositPct: number;
}

export interface Todo {
  id: string;
  body: string;
  due_on: string | null;
  done_at: string | null;
  /** 3 highest, 2 high, 1 medium, 0 none. From the vault's task hub markers. */
  priority: number;
  /** Vault path for an imported item, null for one added in the app. */
  source: string | null;
  created_at: string;
}
