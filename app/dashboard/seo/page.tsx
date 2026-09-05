import type { Metadata } from "next";
import SeoAuditWorkspace from "../../../components/seo/SeoAuditWorkspace";

export const metadata: Metadata = {
  title: "SEO Workspace | Coreframe Dashboard",
  description: "Run and compare technical SEO audits for managed websites.",
};

export default function SeoWorkspacePage() {
  return <SeoAuditWorkspace />;
}
