"use client";

import { useActionState } from "react";
import { Save, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { TIERS, TIER_KEYS } from "@/lib/tiers";
import type { Client } from "@/lib/types";

import { createClientAction, updateClientAction, type ActionState } from "./actions";

const initial: ActionState = { error: null };

const PLAN_STATUS_LABELS = {
  pending: "Not yet billing",
  active: "Active",
  past_due: "Payment failed",
  paused: "Paused",
  cancelled: "Cancelled",
} as const;

/**
 * One form for creating and editing. Tier fills price and allowance on the
 * server unless the fields are given, so the common case is a name and a
 * dropdown, and a special arrangement is still expressible.
 */
export function ClientForm({ client }: { client?: Client }) {
  const [state, formAction, pending] = useActionState(
    client ? updateClientAction : createClientAction,
    initial
  );

  return (
    <form action={formAction} className="space-y-4">
      {client ? <input type="hidden" name="id" value={client.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" name="name" defaultValue={client?.name} required autoComplete="organization" />
        <div className="space-y-2">
          <Label htmlFor="tier">Plan</Label>
          <NativeSelect id="tier" name="tier" defaultValue={client?.tier ?? "essential"} required>
            {TIER_KEYS.map((key) => (
              <option key={key} value={key}>
                {TIERS[key].label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact name" name="contact_name" defaultValue={client?.contact_name} autoComplete="name" />
        <Field label="Contact email" name="contact_email" type="email" defaultValue={client?.contact_email} autoComplete="email" />
        <Field label="Contact phone" name="contact_phone" type="tel" defaultValue={client?.contact_phone} autoComplete="tel" />
        <Field label="Website domain" name="domain" defaultValue={client?.domain} placeholder="example.co.uk" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="plan_status">Status</Label>
          <NativeSelect id="plan_status" name="plan_status" defaultValue={client?.plan_status ?? "active"}>
            {Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Field label="Renews on" name="renews_on" type="date" defaultValue={client?.renews_on} />
        <Field
          label="Price per month"
          name="price"
          inputMode="decimal"
          defaultValue={client ? (client.price_pence / 100).toString() : undefined}
          placeholder="Tier default"
        />
      </div>

      <details className="rounded-xl border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium select-none">
          Stripe, allowance and notes
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stripe customer id" name="stripe_customer_id" defaultValue={client?.stripe_customer_id} placeholder="cus_..." className="font-mono" />
            <Field label="Stripe subscription id" name="stripe_subscription_id" defaultValue={client?.stripe_subscription_id} placeholder="sub_..." className="font-mono" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Monthly allowance, minutes"
              name="allowance_minutes"
              inputMode="numeric"
              defaultValue={client?.allowance_minutes?.toString()}
              placeholder="Tier default"
            />
            <Field
              label="Bank cap, minutes"
              name="allowance_cap_minutes"
              inputMode="numeric"
              defaultValue={client?.allowance_cap_minutes?.toString()}
              placeholder="Tier default"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Leave allowance blank to take the tier default. The friend rate and Local Visibility carry no allowance.
          </p>
          <Field label="URL slug" name="slug" defaultValue={client?.slug} placeholder="From the name" className="font-mono" />
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} rows={3} />
          </div>
        </div>
      </details>

      <FormMessage error={state.error} ok={state.ok} />

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {client ? <Save data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
        {pending ? "Saving..." : client ? "Save changes" : "Add client"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "defaultValue"> & {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? undefined} className={className} {...props} />
    </div>
  );
}
