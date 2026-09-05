import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, telHref } from "@/lib/format";
import { getEnquiry } from "@/lib/queries";
import { cn } from "@/lib/utils";

import { EnquiryActions } from "./enquiry-actions";

export const dynamic = "force-dynamic";

/** Only render the rows the visitor actually answered. */
function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export default async function EnquiryPage({ params }: PageProps<"/enquiries/[id]">) {
  const { id } = await params;
  const enquiry = await getEnquiry(id);

  if (!enquiry) notFound();

  return (
    <>
      <Link
        href="/enquiries"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Enquiries
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{enquiry.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {enquiry.business_name ? `${enquiry.business_name} · ` : null}
            Received {formatDateTime(enquiry.received_at)}
          </p>
        </div>
        <StatusBadge status={enquiry.status} />
      </div>

      {/* Replying is the first thing that happens, so these are the biggest targets. */}
      <div className="grid grid-cols-2 gap-3">
        <ContactButton
          href={enquiry.phone ? telHref(enquiry.phone) : null}
          icon={Phone}
          label="Call"
          primary
        />
        <ContactButton
          href={enquiry.email ? `mailto:${enquiry.email}` : null}
          icon={Mail}
          label="Email"
        />
      </div>

      <dl className="mt-6 divide-y divide-border">
        <Detail label="Phone" value={enquiry.phone} />
        <Detail label="Email" value={enquiry.email} />
        <Detail label="Business" value={enquiry.business_name} />
        <Detail label="Looking for" value={enquiry.service_interest} />
        <Detail label="Budget" value={enquiry.budget} />
        <Detail label="Timing" value={enquiry.timing} />
        <Detail label="Sent from" value={enquiry.page} />
      </dl>

      {enquiry.message ? (
        <>
          <h2 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Their message
          </h2>
          <p className="rounded-xl border border-border p-4 text-sm whitespace-pre-wrap">
            {enquiry.message}
          </p>
        </>
      ) : null}

      <Separator className="my-6" />

      <EnquiryActions id={enquiry.id} status={enquiry.status} />
    </>
  );
}

function ContactButton({
  href,
  icon: Icon,
  label,
  primary = false,
}: {
  href: string | null;
  icon: typeof Phone;
  label: string;
  primary?: boolean;
}) {
  const className = cn(
    "flex h-14 items-center justify-center gap-2 rounded-xl font-medium transition-colors",
    primary
      ? "bg-cyan-action text-white hover:bg-cyan-action/90"
      : "border border-border hover:bg-muted",
    !href && "pointer-events-none opacity-40"
  );

  if (!href) {
    return (
      <span className={className} aria-disabled title={`No ${label.toLowerCase()} given`}>
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <a href={href} className={className}>
      <Icon className="size-4" aria-hidden />
      {label}
    </a>
  );
}
