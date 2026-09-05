import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Client, PlanStatus } from "@/lib/types";

/**
 * Stripe webhook. Keeps plan status, renewal date and the allowance ledger
 * current without Charlie in the loop.
 *
 *   invoice.paid                    credit the tier's minutes, apply the cap,
 *                                   set renews_on, mark active
 *   invoice.payment_failed          mark past_due
 *   customer.subscription.updated   status, renewal date, subscription id
 *   customer.subscription.deleted   cancelled
 *
 * Verified by signature with STRIPE_WEBHOOK_SECRET, no Stripe SDK, matching
 * the plain-fetch convention on every other site. Idempotent through the
 * stripe_events table: Stripe retries, and a retry must do nothing twice.
 *
 * The second of two paths in the app that use the service role key. The
 * other is /api/enquiries. Both are excluded from proxy.ts because neither
 * has a session.
 */

export const runtime = "nodejs";

/** Five minutes, the tolerance Stripe's own libraries use. */
const TOLERANCE_SECONDS = 300;

function verifySignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = new Map(
    header.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key.trim(), rest.join("=").trim()] as const;
    })
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Stripe puts ids in as strings or expanded objects. We only want the id. */
function idOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

function unixToDate(seconds: unknown): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** Stripe's subscription statuses folded onto the five this app knows. */
function planStatusFrom(stripeStatus: unknown): PlanStatus | null {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      return null;
  }
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

interface Invoice extends Record<string, unknown> {
  id: string;
  customer: unknown;
  subscription?: unknown;
  parent?: { subscription_details?: { subscription?: unknown } };
  amount_paid?: number;
  period_end?: number;
  lines?: { data?: Array<{ period?: { end?: number } }> };
}

interface Subscription extends Record<string, unknown> {
  id: string;
  customer: unknown;
  status: string;
  current_period_end?: number;
  items?: { data?: Array<{ current_period_end?: number }> };
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET or SUPABASE_SERVICE_ROLE_KEY not set. Refusing.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // The raw body, byte for byte, is what the signature covers.
  const payload = await request.text();
  if (!verifySignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!event?.id || !event.type || !event.data?.object) {
    return NextResponse.json({ error: "Not a Stripe event." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Idempotency: claim the event id first. A duplicate is a no-op, and 200
  // stops Stripe retrying it.
  const { error: claimError } = await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (claimError) {
    if (claimError.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    console.error("[stripe] Could not record event.", claimError.message);
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  const object = event.data.object;
  const customerId = idOf(object.customer);

  let outcome = "ignored";
  if (customerId) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    const client = (data ?? null) as Client | null;

    if (!client) {
      // Not an error. Stripe knows customers Charlie has not added yet.
      console.warn(`[stripe] ${event.type} for unknown customer ${customerId}. Nothing written.`);
      outcome = "unknown_customer";
    } else {
      outcome = await handle(event, client, supabase);
    }
  }

  await supabase
    .from("stripe_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", event.id);

  return NextResponse.json({ ok: true, outcome });
}

async function handle(
  event: StripeEvent,
  client: Client,
  supabase: ReturnType<typeof createAdminClient>
): Promise<string> {
  const object = event.data.object;

  switch (event.type) {
    case "invoice.paid": {
      const invoice = object as Invoice;
      const patch: Partial<Client> = { plan_status: "active" };

      const renews =
        unixToDate(invoice.lines?.data?.[0]?.period?.end) ?? unixToDate(invoice.period_end);
      if (renews) patch.renews_on = renews;

      const subscriptionId =
        idOf(invoice.subscription) ?? idOf(invoice.parent?.subscription_details?.subscription);
      if (subscriptionId) patch.stripe_subscription_id = subscriptionId;

      // What they actually paid is the truth about the price.
      if (typeof invoice.amount_paid === "number" && invoice.amount_paid > 0) {
        patch.price_pence = invoice.amount_paid;
      }

      const { error } = await supabase.from("clients").update(patch).eq("id", client.id);
      if (error) console.error("[stripe] Client update failed.", error.message);

      if (client.allowance_minutes !== null && client.allowance_minutes > 0) {
        const { error: ledgerError } = await supabase.rpc("apply_allowance", {
          p_client_id: client.id,
          p_type: "credit",
          p_minutes: client.allowance_minutes,
          p_ref_type: "invoice",
          p_ref_id: invoice.id,
          p_note: "Monthly allowance",
        });
        if (ledgerError) {
          console.error("[stripe] Credit failed.", ledgerError.message);
          return "credit_failed";
        }
        return "credited";
      }
      return "renewed";
    }

    case "invoice.payment_failed": {
      const { error } = await supabase
        .from("clients")
        .update({ plan_status: "past_due" })
        .eq("id", client.id);
      if (error) console.error("[stripe] Client update failed.", error.message);
      return "past_due";
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = object as Subscription;
      const patch: Partial<Client> = { stripe_subscription_id: sub.id };
      const status = planStatusFrom(sub.status);
      if (status) patch.plan_status = status;
      const renews =
        unixToDate(sub.current_period_end) ?? unixToDate(sub.items?.data?.[0]?.current_period_end);
      if (renews) patch.renews_on = renews;

      const { error } = await supabase.from("clients").update(patch).eq("id", client.id);
      if (error) console.error("[stripe] Client update failed.", error.message);
      return status ?? "updated";
    }

    case "customer.subscription.deleted": {
      const { error } = await supabase
        .from("clients")
        .update({ plan_status: "cancelled" })
        .eq("id", client.id);
      if (error) console.error("[stripe] Client update failed.", error.message);
      return "cancelled";
    }

    default:
      return "ignored";
  }
}
