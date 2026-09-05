import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isOverdue } from "@/lib/enquiry-status";
import type {
  ChangeRequest,
  Client,
  Enquiry,
  EnquiryStatus,
  LedgerEntry,
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
  client: Pick<Client, "id" | "name"> | null;
}

/** Requests not yet done, for Today. Scheduled ones first, soonest first. */
export async function getOpenRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*, client:clients (id, name)")
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
