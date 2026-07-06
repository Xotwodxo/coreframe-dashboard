import Link from "next/link";

const FEATURES = [
  {
    title: "One number view",
    description:
      "KPI cards for revenue, leads, jobs, and average job value, updated instantly as you add data.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
        <path d="M3 4.75A.75.75 0 013.75 4h6.5a.75.75 0 01.75.75v6.5a.75.75 0 01-.75.75h-6.5a.75.75 0 01-.75-.75v-6.5zM13 4.75a.75.75 0 01.75-.75h6.5a.75.75 0 01.75.75v3.5a.75.75 0 01-.75.75h-6.5a.75.75 0 01-.75-.75v-3.5zM13 11.75a.75.75 0 01.75-.75h6.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75h-6.5a.75.75 0 01-.75-.75v-7.5zM3 14.75a.75.75 0 01.75-.75h6.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-6.5a.75.75 0 01-.75-.75v-4.5z" />
      </svg>
    ),
  },
  {
    title: "12-month trends",
    description:
      "Bar and line charts that show the shape of your business over time. Spot patterns, identify your best months.",
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
    title: "Any data source",
    description:
      "CSV upload or manual entry. No integrations, no API keys. If you have a spreadsheet, you are already ready.",
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
        <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-20 text-center sm:px-6 sm:pt-28 lg:px-8">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Your business numbers, always in front of you.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Stop hunting through spreadsheets. Track your revenue, leads, and
            jobs in one place. CSV import gets you set up in minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="w-full rounded-lg bg-brand px-6 py-3 text-center text-base font-semibold text-navy transition-opacity hover:opacity-90 sm:w-auto"
            >
              View live demo
            </Link>
            <Link
              href="/login"
              className="w-full rounded-lg border border-white/40 px-6 py-3 text-center text-base font-semibold text-white transition-colors hover:border-white hover:bg-white/5 sm:w-auto"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            No credit card. No setup fee.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="flex-1 bg-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand">
                {feature.icon}
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-1.5 px-4 py-5 text-sm text-slate-400 sm:px-6 lg:px-8">
          Built by Coreframe Digital &middot;{" "}
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
