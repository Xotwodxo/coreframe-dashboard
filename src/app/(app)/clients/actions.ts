"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { createClient as createSupabase } from "@/lib/supabase/server";
import { TIERS, isTier } from "@/lib/tiers";
import type { PlanStatus, Tier } from "@/lib/types";

export interface ActionState {
  error: string | null;
  ok?: string | null;
}

const PLAN_STATUSES: PlanStatus[] = ["pending", "active", "past_due", "paused", "cancelled"];

function text(formData: FormData, key: string, max = 200): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value ? value.slice(0, max) : null;
}

function integer(formData: FormData, key: string): number | null {
  const raw = text(formData, key, 20);
  if (raw === null) return null;
  const n = Number(raw.replace(/[£,\s]/g, ""));
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** "£35", "35", "35.00" to pence. Null for anything unreadable. */
function pounds(formData: FormData, key: string): number | null {
  const raw = text(formData, key, 20);
  if (raw === null) return null;
  const cleaned = raw.replace(/[£,\s]/g, "");
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "") return null;
  return Math.round(Number(cleaned) * 100);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

interface ClientRow {
  name: string;
  slug: string;
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
  allowance_minutes: number | null;
  allowance_cap_minutes: number | null;
  notes: string | null;
}

type Parsed = { error: string; row?: undefined } | { error?: undefined; row: ClientRow };

/**
 * Shared field parsing for create and update. Tier fills in price and
 * allowance unless the form overrides them, so a new client is one dropdown
 * and a name, and a special arrangement is still expressible.
 */
function readClientFields(formData: FormData): Parsed {
  const name = text(formData, "name", 120);
  if (!name) return { error: "The client needs a name." };

  const tierRaw = text(formData, "tier", 40);
  if (!isTier(tierRaw)) return { error: "Pick a tier." };
  const spec = TIERS[tierRaw];

  const statusRaw = text(formData, "plan_status", 40) ?? "active";
  if (!PLAN_STATUSES.includes(statusRaw as PlanStatus)) {
    return { error: "That plan status is not one this system knows." };
  }

  const price = pounds(formData, "price");
  const allowanceRaw = text(formData, "allowance_minutes", 20);
  const capRaw = text(formData, "allowance_cap_minutes", 20);
  const allowance =
    allowanceRaw === null ? spec.allowanceMinutes : integer(formData, "allowance_minutes");
  const cap = capRaw === null ? spec.capMinutes : integer(formData, "allowance_cap_minutes");
  if ((allowanceRaw !== null && allowance === null) || (capRaw !== null && cap === null)) {
    return { error: "Allowance and cap must be whole minutes." };
  }

  const renews = text(formData, "renews_on", 10);
  if (renews && !/^\d{4}-\d{2}-\d{2}$/.test(renews)) {
    return { error: "Renewal date must be a date." };
  }

  return {
    row: {
      name,
      slug: text(formData, "slug", 60) ? slugify(text(formData, "slug", 60)!) : slugify(name),
      contact_name: text(formData, "contact_name", 120),
      contact_email: text(formData, "contact_email", 254),
      contact_phone: text(formData, "contact_phone", 40),
      domain: text(formData, "domain", 253)?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null,
      tier: tierRaw,
      plan_status: statusRaw as PlanStatus,
      renews_on: renews,
      price_pence: price ?? spec.pricePence,
      stripe_customer_id: text(formData, "stripe_customer_id", 80),
      stripe_subscription_id: text(formData, "stripe_subscription_id", 80),
      allowance_minutes: allowance,
      allowance_cap_minutes: cap,
      notes: text(formData, "notes", 2000),
    },
  };
}

export async function createClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = readClientFields(formData);
  if (parsed.error !== undefined) return { error: parsed.error };

  const supabase = await createSupabase();
  const { data, error } = await supabase.from("clients").insert(parsed.row).select("id").single();

  if (error) {
    console.error("[clients] Create failed.", error.message);
    return {
      error: error.code === "23505" ? "A client with that slug or Stripe id already exists." : "Could not save the client.",
    };
  }

  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients/${(data as { id: string }).id}`);
}

export async function updateClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = text(formData, "id", 40);
  if (!id) return { error: "Missing client." };
  const parsed = readClientFields(formData);
  if (parsed.error !== undefined) return { error: parsed.error };

  const supabase = await createSupabase();
  const { error } = await supabase.from("clients").update(parsed.row).eq("id", id);
  if (error) {
    console.error("[clients] Update failed.", error.message);
    return {
      error: error.code === "23505" ? "Another client already has that slug or Stripe id." : "Could not save the changes.",
    };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/");
  return { error: null, ok: "Saved." };
}

export async function createRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const clientId = text(formData, "client_id", 40);
  const description = text(formData, "description", 2000);
  if (!clientId || !description) return { error: "Write what they have asked for." };

  const supabase = await createSupabase();
  const { error } = await supabase.from("requests").insert({ client_id: clientId, description });
  if (error) {
    console.error("[requests] Create failed.", error.message);
    return { error: "Could not log the request." };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  return { error: null, ok: "Logged." };
}

export async function scheduleRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = text(formData, "id", 40);
  const clientId = text(formData, "client_id", 40);
  const date = text(formData, "scheduled_for", 10);
  if (!id || !clientId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Pick a date." };
  }

  const supabase = await createSupabase();
  const { error } = await supabase
    .from("requests")
    .update({ status: "scheduled", scheduled_for: date })
    .eq("id", id)
    .neq("status", "done");
  if (error) {
    console.error("[requests] Schedule failed.", error.message);
    return { error: "Could not schedule it." };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  return { error: null };
}

/**
 * Mark a request done and debit the minutes. The one manual field in the
 * system. The ledger function refuses a debit larger than the balance, so
 * work beyond the allowance has to be quoted, not silently borrowed.
 */
export async function completeRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = text(formData, "id", 40);
  const clientId = text(formData, "client_id", 40);
  const minutes = integer(formData, "minutes_spent");
  if (!id || !clientId || minutes === null) return { error: "Enter the minutes as a whole number." };

  const supabase = await createSupabase();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("allowance_minutes")
    .eq("id", clientId)
    .maybeSingle();
  if (clientError || !client) return { error: "Could not open that client." };

  const hasAllowance = (client as { allowance_minutes: number | null }).allowance_minutes !== null;

  if (hasAllowance && minutes > 0) {
    const { error: ledgerError } = await supabase.rpc("apply_allowance", {
      p_client_id: clientId,
      p_type: "debit",
      p_minutes: minutes,
      p_ref_type: "request",
      p_ref_id: id,
      p_note: null,
    });
    if (ledgerError) {
      console.error("[requests] Debit failed.", ledgerError.message);
      const short = ledgerError.message.match(/only \d+ minutes available, \d+ requested/)?.[0];
      return {
        error: short
          ? `${short[0].toUpperCase()}${short.slice(1)}. Log what the allowance covers and quote the rest at the hourly rate.`
          : "Could not record the minutes.",
      };
    }
  }

  const { error } = await supabase
    .from("requests")
    .update({ status: "done", done_at: new Date().toISOString(), minutes_spent: minutes })
    .eq("id", id);
  if (error) {
    console.error("[requests] Complete failed.", error.message);
    return { error: "Minutes were recorded but the request could not be closed. Refresh and check." };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
  return { error: null };
}

/** A hand adjustment with a reason. Starting balances, goodwill, corrections. */
export async function adjustAllowanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const clientId = text(formData, "client_id", 40);
  const type = text(formData, "type", 10);
  const minutes = integer(formData, "minutes");
  const note = text(formData, "note", 300);
  if (!clientId || (type !== "credit" && type !== "debit") || !minutes || minutes <= 0) {
    return { error: "Enter the minutes as a whole number above zero." };
  }
  if (!note) return { error: "Say why. Every ledger row needs a reason." };

  const supabase = await createSupabase();
  const { error } = await supabase.rpc("apply_allowance", {
    p_client_id: clientId,
    p_type: type,
    p_minutes: minutes,
    p_ref_type: "manual",
    p_ref_id: null,
    p_note: note,
  });
  if (error) {
    console.error("[ledger] Adjustment failed.", error.message);
    const short = error.message.match(/only \d+ minutes available, \d+ requested/)?.[0];
    return { error: short ? `${short[0].toUpperCase()}${short.slice(1)}.` : "Could not record the adjustment." };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  return { error: null, ok: "Recorded." };
}
