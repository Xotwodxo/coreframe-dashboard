import type { Metadata } from "next";
import Link from "next/link";
import DemoDashboard from "../../components/demo/DemoDashboard";

export const metadata: Metadata = {
  title: "Live Demo | Coreframe Dashboard",
  description:
    "See Coreframe Dashboard in action with a fully populated example business.",
};

// Rendered per request so "this month" always tracks the real calendar
export const dynamic = "force-dynamic";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-navy-light">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-slate-200">
            You are viewing a demo. Bright Spark Electrical is a fictional
            business.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
          >
            Get your own dashboard &rarr;
          </Link>
        </div>
      </div>
      <DemoDashboard />
    </div>
  );
}
