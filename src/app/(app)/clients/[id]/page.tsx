import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Globe, Mail, Phone } from "lucide-react";

import { ClientMark } from "@/components/ui/client-mark";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatDateTime, formatMinutes, formatPence, formatRelative, telHref } from "@/lib/format";
import { AskReviewButton } from "@/components/ui/ask-review-button";
import { getClient, getClientEnquiries, getLedger, getRequests, getReviewSettings } from "@/lib/queries";
import { buildReviewAsk } from "@/lib/reply";
import { TIERS } from "@/lib/tiers";
import type { LedgerEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ClientForm } from "../client-form";
import { recordClientReviewAsk } from "../actions";
import { AdjustForm, CompleteForm, NewRequestForm, ScheduleForm } from "./request-forms";

export const dynamic = "force-dynamic";

function Detail({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right font-medium", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

const LEDGER_LABEL: Record<LedgerEntry["type"], string> = {
  credit: "Added",
  debit: "Used",
  cap_expire: "Expired",
};

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const [ledger, requests, enquiries, reviewSettings] = await Promise.all([
    getLedger(id),
    getRequests(id),
    getClientEnquiries(id),
    getReviewSettings(),
  ]);
  const reviewAsk = buildReviewAsk(
    { name: client.contact_name || client.name, email: client.contact_email, business: client.name },
    reviewSettings
  );
  const recordAsk = async () => {
    "use server";
    await recordClientReviewAsk(client.id);
  };

  const tier = TIERS[client.tier];
  const hasAllowance = client.allowance_minutes !== null;
  const open = requests.filter((request) => request.status !== "done");
  const done = requests.filter((request) => request.status === "done");

  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Clients
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ClientMark name={client.name} logoPath={client.logo_path} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tier.label} · {formatPence(client.price_pence)} a month
            </p>
          </div>
        </div>
        <StatusBadge status={client.plan_status} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Contact href={client.contact_phone ? telHref(client.contact_phone) : null} icon={Phone} label="Call" />
        <Contact href={client.contact_email ? `mailto:${client.contact_email}` : null} icon={Mail} label="Email" />
        <Contact href={client.domain ? `https://${client.domain}` : null} icon={Globe} label="Site" external />
      </div>

      <div className="mt-4">
        <AskReviewButton
          mailto={reviewAsk.mailto}
          lastAsked={client.review_requested_at}
          hasLinks={reviewAsk.hasLinks}
          onTap={recordAsk}
        />
      </div>

      {/* Allowance: the number that has to be right when a client asks. */}
      <div className="mt-6 rounded-xl border border-border p-5">
        {hasAllowance ? (
          <>
            <p className="text-sm text-muted-foreground">Minutes available</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-navy tabular-nums">
              {formatMinutes(client.balance_minutes ?? 0)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatMinutes(client.allowance_minutes ?? 0)} added each month
              {client.allowance_cap_minutes !== null ? `, banks up to ${formatMinutes(client.allowance_cap_minutes)}` : ""}.
              Beyond that is quoted at the hourly rate.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Allowance</p>
            <p className="mt-1 text-xl font-semibold text-navy">Goodwill basis, no allowance</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Minor updates as goodwill. Anything more is quoted separately.
            </p>
          </>
        )}
      </div>

      <dl className="mt-6 divide-y divide-border">
        <Detail label="Contact" value={client.contact_name} />
        <Detail label="Phone" value={client.contact_phone} />
        <Detail label="Email" value={client.contact_email} />
        <Detail label="Domain" value={client.domain} />
        <Detail label={client.plan_status === "pending" ? "Billing starts" : "Renews"} value={client.renews_on ? formatDate(client.renews_on) : null} />
        <Detail label="Stripe customer" value={client.stripe_customer_id} mono />
        <Detail label="Stripe subscription" value={client.stripe_subscription_id} mono />
        <Detail label="Client since" value={formatDate(client.created_at)} />
      </dl>
      {client.notes ? (
        <p className="mt-4 rounded-xl border border-border p-4 text-sm whitespace-pre-wrap">{client.notes}</p>
      ) : null}

      <SectionTitle>Requests</SectionTitle>
      <NewRequestForm clientId={client.id} />

      {open.length === 0 && done.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing asked for yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {open.map((request) => (
            <li key={request.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Asked {formatRelative(request.created_at)}
                    {request.scheduled_for ? ` · scheduled ${formatDate(request.scheduled_for)}` : ""}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                <ScheduleForm id={request.id} clientId={client.id} current={request.scheduled_for} />
                <CompleteForm id={request.id} clientId={client.id} hasAllowance={hasAllowance} />
              </div>
            </li>
          ))}
          {done.map((request) => (
            <li key={request.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <div className="min-w-0">
                <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Done {request.done_at ? formatDate(request.done_at) : ""}
                  {request.minutes_spent !== null ? ` · ${formatMinutes(request.minutes_spent)}` : ""}
                </p>
              </div>
              <StatusBadge status="done" />
            </li>
          ))}
        </ul>
      )}

      {hasAllowance ? (
        <>
          <SectionTitle>Allowance history</SectionTitle>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet. The first Stripe payment adds {formatMinutes(client.allowance_minutes ?? 0)}.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {ledger.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {LEDGER_LABEL[entry.type]} {formatMinutes(entry.minutes)}
                      <span className="text-muted-foreground">
                        {entry.note ? ` · ${entry.note}` : entry.ref_type === "request" ? " · change request" : entry.ref_type === "invoice" ? " · Stripe payment" : ""}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.occurred_at)}</p>
                  </div>
                  <p
                    className={cn(
                      "tabular-nums",
                      entry.type === "credit" && "text-good",
                      entry.type === "debit" && "text-navy",
                      entry.type === "cap_expire" && "text-muted-foreground"
                    )}
                  >
                    {entry.type === "credit" ? "+" : "-"}
                    {entry.minutes}
                  </p>
                  <p className="w-16 text-right text-muted-foreground tabular-nums">{entry.balance_after}</p>
                </li>
              ))}
            </ul>
          )}
          <details className="mt-3 rounded-xl border border-border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium select-none">Adjust by hand</summary>
            <div className="border-t border-border p-4">
              <AdjustForm clientId={client.id} />
            </div>
          </details>
        </>
      ) : null}

      {enquiries.length > 0 ? (
        <>
          <SectionTitle>Enquiries from their site</SectionTitle>
          <ul className="space-y-2">
            {enquiries.map((enquiry) => (
              <li key={enquiry.id}>
                <Link href={`/enquiries/${enquiry.id}`} className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-cyan-action/40 hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy">{enquiry.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{formatRelative(enquiry.received_at)}</p>
                  </div>
                  <StatusBadge status={enquiry.status} />
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Separator className="my-8" />

      <details className="rounded-xl border border-border">
        <summary className="cursor-pointer px-4 py-3 font-medium select-none">Edit client</summary>
        <div className="border-t border-border p-4">
          <ClientForm client={client} />
        </div>
      </details>
    </>
  );
}

function Contact({
  href,
  icon: Icon,
  label,
  external = false,
}: {
  href: string | null;
  icon: typeof Phone;
  label: string;
  external?: boolean;
}) {
  const className = cn(
    "flex h-12 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium transition-colors hover:bg-muted",
    !href && "pointer-events-none opacity-40"
  );
  if (!href) {
    return (
      <span className={className} aria-disabled>
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
    );
  }
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      <Icon className="size-4" aria-hidden />
      {label}
    </a>
  );
}
