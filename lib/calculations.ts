import type {
  KpiData,
  MetricEntry,
  MonthlySummary,
  MonthlyTrend,
  ServiceBreakdown,
} from "./types";
import { formatMonthShort, monthName } from "./format";

type MonthTotals = { revenue: number; leads: number; jobs: number };

const ZERO: MonthTotals = { revenue: 0, leads: 0, jobs: 0 };

function monthKeyOf(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function monthStart(offset: number, from: Date = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() + offset, 1);
}

function aggregateByMonth(entries: MetricEntry[]): Map<string, MonthTotals> {
  const byMonth = new Map<string, MonthTotals>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    const totals = byMonth.get(key) ?? { revenue: 0, leads: 0, jobs: 0 };
    if (entry.category === "revenue") totals.revenue += Number(entry.value);
    if (entry.category === "lead") totals.leads += Number(entry.value);
    if (entry.category === "job_completed") totals.jobs += Number(entry.value);
    byMonth.set(key, totals);
  }
  return byMonth;
}

function percentChange(current: number, prior: number): number {
  if (prior === 0) return current === 0 ? 0 : 100;
  return ((current - prior) / prior) * 100;
}

// Returns { thisMonth, lastMonth, change (%) } for revenue, leads, jobs, avgJobValue
export function getKpiData(entries: MetricEntry[]): KpiData {
  const byMonth = aggregateByMonth(entries);
  const thisStart = monthStart(0);
  const lastStart = monthStart(-1);
  const t =
    byMonth.get(monthKeyOf(thisStart.getFullYear(), thisStart.getMonth())) ??
    ZERO;
  const l =
    byMonth.get(monthKeyOf(lastStart.getFullYear(), lastStart.getMonth())) ??
    ZERO;

  const avgThis = t.jobs > 0 ? t.revenue / t.jobs : 0;
  const avgLast = l.jobs > 0 ? l.revenue / l.jobs : 0;

  return {
    revenue: {
      thisMonth: t.revenue,
      lastMonth: l.revenue,
      change: percentChange(t.revenue, l.revenue),
    },
    leads: {
      thisMonth: t.leads,
      lastMonth: l.leads,
      change: percentChange(t.leads, l.leads),
    },
    jobs: {
      thisMonth: t.jobs,
      lastMonth: l.jobs,
      change: percentChange(t.jobs, l.jobs),
    },
    avgJobValue: {
      thisMonth: avgThis,
      lastMonth: avgLast,
      change: percentChange(avgThis, avgLast),
    },
  };
}

// Returns array of { month, revenue, leads, jobs } for the last 12 calendar
// months (oldest first), filled with 0 for empty months
export function getMonthlyTrend(entries: MetricEntry[]): MonthlyTrend[] {
  const byMonth = aggregateByMonth(entries);
  const trend: MonthlyTrend[] = [];
  for (let offset = -11; offset <= 0; offset++) {
    const start = monthStart(offset);
    const totals =
      byMonth.get(monthKeyOf(start.getFullYear(), start.getMonth())) ?? ZERO;
    trend.push({
      month: monthName(start.getMonth()),
      revenue: totals.revenue,
      leads: totals.leads,
      jobs: totals.jobs,
    });
  }
  return trend;
}

// Returns { label, value } for revenue in the last 12 calendar months,
// sorted descending, top 5 + 'Other'
export function getServiceBreakdown(
  entries: MetricEntry[]
): ServiceBreakdown[] {
  const windowStart = monthStart(-11);
  const windowStartKey = `${windowStart.getFullYear()}-${String(
    windowStart.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const byLabel = new Map<string, number>();
  for (const entry of entries) {
    if (entry.category !== "revenue") continue;
    if (!entry.label) continue;
    if (entry.date < windowStartKey) continue;
    byLabel.set(
      entry.label,
      (byLabel.get(entry.label) ?? 0) + Number(entry.value)
    );
  }

  const sorted = [...byLabel.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= 6) return sorted;

  const top = sorted.slice(0, 5);
  const other = sorted
    .slice(5)
    .reduce((sum, item) => sum + item.value, 0);
  return [...top, { label: "Other", value: other }];
}

// Returns last 6 months summary for the table, most recent first
export function getMonthlySummary(entries: MetricEntry[]): MonthlySummary[] {
  const byMonth = aggregateByMonth(entries);
  const summary: MonthlySummary[] = [];
  for (let offset = 0; offset >= -5; offset--) {
    const start = monthStart(offset);
    const prior = monthStart(offset - 1);
    const totals =
      byMonth.get(monthKeyOf(start.getFullYear(), start.getMonth())) ?? ZERO;
    const priorTotals =
      byMonth.get(monthKeyOf(prior.getFullYear(), prior.getMonth())) ?? ZERO;
    summary.push({
      month: formatMonthShort(
        `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`
      ),
      revenue: totals.revenue,
      leads: totals.leads,
      jobs: totals.jobs,
      avgJobValue: totals.jobs > 0 ? totals.revenue / totals.jobs : 0,
      revenueChange:
        priorTotals.revenue === 0
          ? null
          : percentChange(totals.revenue, priorTotals.revenue),
    });
  }
  return summary;
}
