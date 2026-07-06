import type { Business, MetricEntry, ServiceBreakdown } from "./types";

// Fictional business shown on the public /demo route. No real data.
export const demoBusiness: Business = {
  id: "demo-business",
  user_id: "demo-user",
  business_name: "Bright Spark Electrical",
  business_type: "Electrical Contractor",
  currency: "GBP",
  brand_colour: "#00C4CC",
  created_at: "2025-01-01T00:00:00Z",
};

// 12 months of monthly figures, offset 0 = current calendar month (partial)
const DEMO_MONTHLY: {
  offset: number;
  revenue: number;
  leads: number;
  jobs: number;
}[] = [
  { offset: 0, revenue: 9800, leads: 22, jobs: 16 },
  { offset: -1, revenue: 14200, leads: 31, jobs: 24 },
  { offset: -2, revenue: 16800, leads: 38, jobs: 29 },
  { offset: -3, revenue: 15400, leads: 35, jobs: 27 },
  { offset: -4, revenue: 11200, leads: 26, jobs: 20 },
  { offset: -5, revenue: 9600, leads: 21, jobs: 17 },
  { offset: -6, revenue: 8400, leads: 18, jobs: 14 },
  { offset: -7, revenue: 10200, leads: 23, jobs: 18 },
  { offset: -8, revenue: 13600, leads: 30, jobs: 23 },
  { offset: -9, revenue: 15100, leads: 34, jobs: 26 },
  { offset: -10, revenue: 12800, leads: 29, jobs: 22 },
  { offset: -11, revenue: 11400, leads: 25, jobs: 19 },
];

// Revenue split for the donut chart
export const demoServiceBreakdown: ServiceBreakdown[] = [
  { label: "Consumer unit replacement", value: 4800 },
  { label: "EV charger installation", value: 3200 },
  { label: "Rewire (full)", value: 2600 },
  { label: "Fault finding", value: 1400 },
  { label: "Lighting installation", value: 900 },
  { label: "Other", value: 900 },
];

function isoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
}

// Builds metric entries relative to today so the demo always shows a live
// looking 12 month window. Current month is dated ~60% of the way through.
export function getDemoEntries(): MetricEntry[] {
  const now = new Date();
  const entries: MetricEntry[] = [];

  for (const { offset, revenue, leads, jobs } of DEMO_MONTHLY) {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const daysInMonth = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0
    ).getDate();
    const day =
      offset === 0
        ? Math.max(1, Math.min(now.getDate(), Math.round(daysInMonth * 0.6)))
        : 15;
    const date = isoDate(start.getFullYear(), start.getMonth(), day);
    const suffix = Math.abs(offset);

    entries.push(
      {
        id: `demo-revenue-${suffix}`,
        business_id: demoBusiness.id,
        date,
        category: "revenue",
        value: revenue,
        label: null,
        notes: null,
        created_at: `${date}T09:00:00Z`,
      },
      {
        id: `demo-lead-${suffix}`,
        business_id: demoBusiness.id,
        date,
        category: "lead",
        value: leads,
        label: null,
        notes: null,
        created_at: `${date}T09:00:00Z`,
      },
      {
        id: `demo-job-${suffix}`,
        business_id: demoBusiness.id,
        date,
        category: "job_completed",
        value: jobs,
        label: null,
        notes: null,
        created_at: `${date}T09:00:00Z`,
      }
    );
  }

  return entries;
}
