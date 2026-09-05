import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { ClientMark } from "@/components/ui/client-mark";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatMinutes, formatPence } from "@/lib/format";
import { getClients, getDueRenewals } from "@/lib/queries";
import { TIERS } from "@/lib/tiers";

import { ClientForm } from "./client-form";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, due] = await Promise.all([getClients(), getDueRenewals(30)]);
  const monthly = clients
    .filter((client) => client.plan_status === "active")
    .reduce((sum, client) => sum + client.price_pence, 0);

  return (
    <>
      <PageHeader
        title="Clients"
        description={
          clients.length === 0
            ? "Care plan clients, their allowance and what they pay."
            : `${clients.length} on a plan, ${formatPence(monthly)} a month billing.`
        }
      />

      {due.rows.length > 0 ? (
        <div className="mb-4 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">Due in the next 30 days</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-navy tabular-nums">{formatPence(due.totalPence)}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {due.rows.map((row) => (
              <li key={row.id} className="flex justify-between gap-3">
                <span className="truncate">
                  {row.name}
                  {row.plan_status === "pending" ? <span className="text-muted-foreground"> (first payment)</span> : null}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {formatDate(row.renews_on)} · {formatPence(row.price_pence)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add the first care plan client below. Stripe keeps the renewal date and allowance current from there."
        />
      ) : (
        <ul className="space-y-2">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/clients/${client.id}`}
                className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-cyan-action/40 hover:bg-muted/50"
              >
                <ClientMark name={client.name} logoPath={client.logo_path} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy">{client.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {TIERS[client.tier].label} · {formatPence(client.price_pence)}/mo
                    {client.renews_on ? ` · renews ${formatDate(client.renews_on)}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm">
                    {client.balance_minutes === null ? (
                      <span className="text-muted-foreground">No allowance, goodwill basis</span>
                    ) : (
                      <>
                        <span className="font-medium tabular-nums">{formatMinutes(client.balance_minutes)}</span>
                        <span className="text-muted-foreground"> left</span>
                      </>
                    )}
                  </p>
                </div>
                <StatusBadge status={client.plan_status} />
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-8 rounded-xl border border-border" open={clients.length === 0}>
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-medium select-none">
          <Plus className="size-4 text-cyan-action" aria-hidden />
          Add a client
        </summary>
        <div className="border-t border-border p-4">
          <ClientForm />
        </div>
      </details>
    </>
  );
}
