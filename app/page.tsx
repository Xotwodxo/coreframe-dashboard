import Link from "next/link";

const MOCK_KPIS = [
  { label: "Revenue", value: "£14,200" },
  { label: "Leads", value: "31" },
  { label: "Jobs", value: "24" },
  { label: "Avg Job Value", value: "£592" },
];

const MOCK_BARS = [
  { month: "Jan", height: "45%" },
  { month: "Feb", height: "60%" },
  { month: "Mar", height: "52%" },
  { month: "Apr", height: "78%" },
  { month: "May", height: "66%" },
  { month: "Jun", height: "92%" },
];

const TRUSTED_BY = [
  "Plumbers",
  "Electricians",
  "Dog Groomers",
  "Cleaners",
  "Photographers",
  "Any service business",
];

const STEPS = [
  {
    title: "You get in touch",
    description: "Tell us about your business and what you want to track.",
  },
  {
    title: "We build it",
    description:
      "Coreframe Digital configures your dashboard, connects your data, and brands it to you.",
  },
  {
    title: "You get the keys",
    description:
      "Log in and start tracking. We handle any changes you need along the way.",
  },
];

const FEATURES = [
  {
    title: "Live KPI cards",
    description:
      "Revenue, leads, jobs, and average job value. Updated the moment your data changes.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M3 4.75A.75.75 0 013.75 4h6.5a.75.75 0 01.75.75v6.5a.75.75 0 01-.75.75h-6.5a.75.75 0 01-.75-.75v-6.5zM13 4.75a.75.75 0 01.75-.75h6.5a.75.75 0 01.75.75v3.5a.75.75 0 01-.75.75h-6.5a.75.75 0 01-.75-.75v-3.5zM13 11.75a.75.75 0 01.75-.75h6.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75h-6.5a.75.75 0 01-.75-.75v-7.5zM3 14.75a.75.75 0 01.75-.75h6.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-6.5a.75.75 0 01-.75-.75v-4.5z" />
      </svg>
    ),
  },
  {
    title: "12-month trend charts",
    description:
      "Bar and line charts showing the shape of your year. Spot your best months and plan around them.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M15.22 6.268a.75.75 0 01.968-.432l5.942 2.28a.75.75 0 01.431.97l-2.28 5.941a.75.75 0 11-1.4-.537l1.63-4.251-1.086.483a11.2 11.2 0 00-5.45 5.174.75.75 0 01-1.199.19L9 12.31l-6.22 6.22a.75.75 0 11-1.06-1.06l6.75-6.75a.75.75 0 011.06 0l3.606 3.605a12.694 12.694 0 015.68-4.973l1.086-.484-4.251-1.631a.75.75 0 01-.432-.97z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    title: "CSV import or manual entry",
    description:
      "No integrations, no API keys. If you have a spreadsheet, you are already ready to go.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

function DashboardMockup() {
  return (
    <div className="rounded-2xl bg-[#131a26] p-4 sm:p-6">
      {/* Floating browser window */}
      <div className="overflow-hidden rounded-xl bg-white shadow-2xl shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="mx-auto hidden rounded-md bg-white px-3 py-0.5 text-[10px] text-slate-400 ring-1 ring-slate-200 sm:block">
            dashboard.coreframedigital.co.uk
          </span>
          <span className="w-12" aria-hidden="true" />
        </div>

        <div className="space-y-3 bg-slate-50 p-3 sm:p-4">
          {/* Mini KPI cards */}
          <div className="grid grid-cols-4 gap-2">
            {MOCK_KPIS.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border-t-2 border-brand bg-white p-2 shadow-sm"
              >
                <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                  {kpi.value}
                </p>
                <p className="mt-0.5 text-[9px] leading-tight text-slate-500 sm:text-[10px]">
                  {kpi.label}
                </p>
              </div>
            ))}
          </div>

          {/* Bar chart mockup */}
          <div className="rounded-lg bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-600">
              Monthly Revenue
            </p>
            <div className="mt-2 flex h-28 items-end gap-2 sm:h-32">
              {MOCK_BARS.map((bar) => (
                <div
                  key={bar.month}
                  className="flex h-full flex-1 flex-col justify-end"
                >
                  <div
                    className="rounded-t bg-brand"
                    style={{ height: bar.height }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              {MOCK_BARS.map((bar) => (
                <p
                  key={bar.month}
                  className="flex-1 text-center text-[9px] text-slate-400"
                >
                  {bar.month}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky navbar */}
      <header className="sticky top-0 z-40 bg-navy">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-lg font-semibold tracking-tight text-white">
            Coreframe <span className="text-brand">Dashboard</span>
          </span>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-200 transition-colors hover:text-white"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-navy">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:pb-28 lg:pt-24 lg:px-8">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Stop guessing. Start knowing.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              A custom business dashboard built for you by Coreframe Digital.
              Track your revenue, leads, and jobs - all in one place. Ready in
              48 hours.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo"
                className="rounded-lg bg-brand px-6 py-3 text-center text-base font-semibold text-navy transition-opacity hover:opacity-90"
              >
                View live demo
              </Link>
              <a
                href="https://coreframedigital.co.uk/contact"
                className="rounded-lg border border-white/40 px-6 py-3 text-center text-base font-semibold text-white transition-colors hover:border-white hover:bg-white/5"
              >
                Get in touch
              </a>
            </div>
            <p className="mt-6 text-sm text-slate-400">
              Custom built. No subscriptions. Yours to keep.
            </p>
          </div>

          <DashboardMockup />
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-navy-light">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-300">
            <span className="font-semibold text-slate-200">
              Built for &rarr;
            </span>{" "}
            {TRUSTED_BY.join(" · ")}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900">
            Your dashboard, ready in 48 hours
          </h2>
          <div className="relative mt-14 grid grid-cols-1 gap-10 md:grid-cols-3">
            {/* Connecting line on desktop */}
            <div
              className="absolute left-[16.66%] right-[16.66%] top-6 hidden h-px bg-slate-200 md:block"
              aria-hidden="true"
            />
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="relative flex flex-col items-center text-center"
              >
                <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-navy">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-70 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900">
            Everything you need to see your business clearly
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-white p-7 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy">
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ready to see your numbers clearly?
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Takes 48 hours to set up. No subscriptions. One-time build fee.
          </p>
          <Link
            href="/demo"
            className="mt-9 inline-block rounded-lg bg-brand px-8 py-4 text-lg font-semibold text-navy transition-opacity hover:opacity-90"
          >
            View live demo
          </Link>
          <p className="mt-6 text-sm text-slate-400">
            Or contact us at{" "}
            <a
              href="https://coreframedigital.co.uk"
              className="text-slate-300 underline transition-colors hover:text-white"
            >
              coreframedigital.co.uk
            </a>{" "}
            to get started
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#131a26]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-1.5 px-4 py-5 text-sm text-slate-400 sm:px-6 lg:px-8">
          &copy; 2026 Coreframe Digital. All rights reserved. &middot;{" "}
          <a
            href="https://coreframedigital.co.uk"
            className="text-slate-300 transition-colors hover:text-white"
          >
            coreframedigital.co.uk
          </a>
        </div>
      </footer>
    </div>
  );
}
