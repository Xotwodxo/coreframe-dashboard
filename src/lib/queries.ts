import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isOverdue } from "@/lib/enquiry-status";
import { DEFAULT_QUOTE_SETTINGS, isExpired } from "@/lib/quotes";
import { DEFAULT_REPLY, DEFAULT_REVIEW } from "@/lib/reply";
import type {
  ChangeRequest,
  Client,
  DocumentRow,
  Enquiry,
  EnquiryNote,
  EnquiryStatus,
  LedgerEntry,
  PriceItem,
  Quote,
  QuoteSettings,
  ReplySettings,
  ReviewSettings,
  Todo,
} from "@/lib/types";

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

// ---------------------------------------------------------------------------
// Phase 2: clients, allowance, requests
// ---------------------------------------------------------------------------

export interface ClientWithBalance extends Client {
  /** Null when the plan carries no allowance. */
  balance_minutes: number | null;
}

async function latestBalances(clientIds: string[]) {
  const balances = new Map<string, number>();
  if (clientIds.length === 0) return balances;
  const supabase = await createClient();
  // Newest first; the first row seen per client is its current balance.
  const { data, error } = await supabase
    .from("allowance_ledger")
    .select("client_id, balance_after, seq")
    .in("client_id", clientIds)
    .order("seq", { ascending: false });
  warn("latestBalances", error?.message);
  for (const row of (data ?? []) as Pick<LedgerEntry, "client_id" | "balance_after">[]) {
    if (!balances.has(row.client_id)) balances.set(row.client_id, row.balance_after);
  }
  return balances;
}

function withBalance(client: Client, balances: Map<string, number>): ClientWithBalance {
  return {
    ...client,
    balance_minutes:
      client.allowance_minutes === null ? null : (balances.get(client.id) ?? 0),
  };
}

export async function getClients(): Promise<ClientWithBalance[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*").order("name");
  warn("getClients", error?.message);
  const clients = (data ?? []) as Client[];
  const balances = await latestBalances(clients.map((client) => client.id));
  return clients.map((client) => withBalance(client, balances));
}

export async function getClient(id: string): Promise<ClientWithBalance | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  warn("getClient", error?.message);
  if (!data) return null;
  const client = data as Client;
  const balances = await latestBalances([client.id]);
  return withBalance(client, balances);
}

export async function getLedger(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("allowance_ledger")
    .select("*")
    .eq("client_id", clientId)
    .order("seq", { ascending: false })
    .limit(100);
  warn("getLedger", error?.message);
  return (data ?? []) as LedgerEntry[];
}

export async function getRequests(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  warn("getRequests", error?.message);
  return (data ?? []) as ChangeRequest[];
}

export async function getClientEnquiries(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .eq("client_id", clientId)
    .order("received_at", { ascending: false })
    .limit(20);
  warn("getClientEnquiries", error?.message);
  return (data ?? []) as Enquiry[];
}

export interface OpenRequest extends ChangeRequest {
  client: Pick<Client, "id" | "name" | "logo_path"> | null;
}

/** Requests not yet done, for Today. Scheduled ones first, soonest first. */
export async function getOpenRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*, client:clients (id, name, logo_path)")
    .in("status", ["new", "scheduled"])
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  warn("getOpenRequests", error?.message);
  return (data ?? []) as OpenRequest[];
}

/** Plans renewing inside the window, plus anything past due, for Today. */
export async function getRenewals(days = 14) {
  const supabase = await createClient();
  const until = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .or(`plan_status.eq.past_due,and(renews_on.lte.${until},plan_status.in.(active,pending))`)
    .order("renews_on", { ascending: true, nullsFirst: false });
  warn("getRenewals", error?.message);
  return (data ?? []) as Client[];
}

// ---------------------------------------------------------------------------
// Phase 3: notes, documents, reply settings, pipeline numbers
// ---------------------------------------------------------------------------

export async function getEnquiryNotes(enquiryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enquiry_notes")
    .select("*")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: false });
  warn("getEnquiryNotes", error?.message);
  return (data ?? []) as EnquiryNote[];
}

export async function getDocuments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("sort_order")
    .order("title");
  warn("getDocuments", error?.message);
  return (data ?? []) as DocumentRow[];
}

export async function getReplySettings(): Promise<ReplySettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("value").eq("key", "reply").maybeSingle();
  warn("getReplySettings", error?.message);
  const value = (data as { value: Partial<ReplySettings> } | null)?.value;
  return {
    subject: value?.subject ?? DEFAULT_REPLY.subject,
    body: value?.body ?? DEFAULT_REPLY.body,
    bookingLink: value?.bookingLink ?? DEFAULT_REPLY.bookingLink,
  };
}

/** Quoted and won this calendar month, in pence. Zero when nothing yet. */
export async function getPipelineThisMonth() {
  const supabase = await createClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const since = start.toISOString();

  const [quoted, won] = await Promise.all([
    supabase.from("enquiries").select("quoted_pence").gte("quoted_at", since).not("quoted_pence", "is", null),
    supabase
      .from("enquiries")
      .select("quoted_pence")
      .eq("status", "won")
      .gte("status_changed_at", since)
      .not("quoted_pence", "is", null),
  ]);
  warn("getPipelineThisMonth", quoted.error?.message ?? won.error?.message);
  const sum = (rows: { quoted_pence: number | null }[] | null) =>
    (rows ?? []).reduce((total, row) => total + (row.quoted_pence ?? 0), 0);
  return { quotedPence: sum(quoted.data), wonPence: sum(won.data) };
}

/** Care plans renewing in the next `days`, for the Clients strip. */
export async function getDueRenewals(days = 30) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, renews_on, price_pence, plan_status, logo_path")
    .in("plan_status", ["active", "pending", "past_due"])
    .gte("renews_on", today)
    .lte("renews_on", until)
    .order("renews_on");
  warn("getDueRenewals", error?.message);
  const rows = (data ?? []) as Pick<Client, "id" | "name" | "renews_on" | "price_pence" | "plan_status" | "logo_path">[];
  return { rows, totalPence: rows.reduce((sum, row) => sum + row.price_pence, 0) };
}

export async function getReviewSettings(): Promise<ReviewSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("value").eq("key", "review").maybeSingle();
  warn("getReviewSettings", error?.message);
  const value = (data as { value: Partial<ReviewSettings> } | null)?.value;
  return {
    subject: value?.subject ?? DEFAULT_REVIEW.subject,
    body: value?.body ?? DEFAULT_REVIEW.body,
    googleUrl: value?.googleUrl ?? DEFAULT_REVIEW.googleUrl,
    trustpilotUrl: value?.trustpilotUrl ?? DEFAULT_REVIEW.trustpilotUrl,
  };
}

// ---------------------------------------------------------------------------
// Phase 4: quotes
// ---------------------------------------------------------------------------

export async function getPriceItems(includeInactive = false) {
  const supabase = await createClient();
  let query = supabase.from("price_items").select("*").order("sort_order").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  warn("getPriceItems", error?.message);
  return (data ?? []) as PriceItem[];
}

export async function getQuote(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  warn("getQuote", error?.message);
  return (data ?? null) as Quote | null;
}

export async function getQuotesFor(ref: { enquiryId?: string; clientId?: string }) {
  const supabase = await createClient();
  let query = supabase.from("quotes").select("*").order("created_at", { ascending: false });
  if (ref.enquiryId) query = query.eq("enquiry_id", ref.enquiryId);
  else if (ref.clientId) query = query.eq("client_id", ref.clientId);
  else return [] as Quote[];
  const { data, error } = await query;
  warn("getQuotesFor", error?.message);
  return (data ?? []) as Quote[];
}

/** Sent quotes past their valid-until date, for Today. */
export async function getExpiredQuotes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("status", "sent")
    .order("sent_at", { ascending: true });
  warn("getExpiredQuotes", error?.message);
  return ((data ?? []) as Quote[]).filter((quote) => isExpired(quote));
}

export async function getQuoteSettings(): Promise<QuoteSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("value").eq("key", "quote").maybeSingle();
  warn("getQuoteSettings", error?.message);
  const value = (data as { value: Partial<QuoteSettings> } | null)?.value ?? {};
  return { ...DEFAULT_QUOTE_SETTINGS, ...value };
}

// ---------------------------------------------------------------------------
// To-do list
// ---------------------------------------------------------------------------

/** Open items: dated ones first, soonest first, then by priority, then by age. */
export async function getOpenTodos() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .is("done_at", null)
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });
  warn("getOpenTodos", error?.message);
  return (data ?? []) as Todo[];
}

export async function getDoneTodos(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .not("done_at", "is", null)
    .order("done_at", { ascending: false })
    .limit(limit);
  warn("getDoneTodos", error?.message);
  return (data ?? []) as Todo[];
}

/** For Today: anything due today or earlier, plus undated items, capped. */
export async function getTodayTodos(limit = 6) {
  const open = await getOpenTodos();
  const today = new Date().toISOString().slice(0, 10);
  const due = open.filter((todo) => todo.due_on && todo.due_on <= today);
  // Undated items only reach Today when they carry a high priority.
  const urgent = open.filter((todo) => !todo.due_on && todo.priority >= 2);
  return { items: [...due, ...urgent].slice(0, limit), total: open.length };
}
