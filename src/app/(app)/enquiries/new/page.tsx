import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";

import { AddEnquiryForm } from "./add-enquiry-form";

export default function NewEnquiryPage() {
  return (
    <>
      <Link
        href="/enquiries"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Enquiries
      </Link>
      <PageHeader
        title="Log a lead"
        description="For anything that did not come through the website: a Facebook group, Bark, a call, a referral."
      />
      <AddEnquiryForm />
    </>
  );
}
