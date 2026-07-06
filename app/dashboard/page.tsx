import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import {
  getKpiData,
  getMonthlySummary,
  getMonthlyTrend,
  getServiceBreakdown,
} from "../../lib/calculations";
import { formatCurrency } from "../../lib/format";
import type { Goal, MetricEntry } from "../../lib/types";
import DashboardHeader from "../../components/layout/DashboardHeader";
import KpiCard from "../../components/dashboard/KpiCard";
import RevenueChart from "../../components/dashboard/RevenueChart";
import LeadsChart from "../../components/dashboard/LeadsChart";
import ServiceBreakdownChart from "../../components/dashboard/ServiceBreakdownChart";
import MonthlySummaryTable from "../../components/dashboard/MonthlySummaryTable";

function goalProgress(
  goal: Goal | undefined,
  current: number,
  formatValue: (value: number) => string
) {
  if (!goal || goal.target <= 0) return undefined;
  const percent = (current / goal.target) * 100;
  return {
    percent,
    text: `${formatValue(current)} of ${formatValue(goal.target)} target: ${Math.round(percent)}%`,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/dashboard/settings?onboarding=true");
  }

  // Current year plus prior year covers the 12-month charts and the
  // month-over-month comparisons
  const priorYearStart = `${new Date().getFullYear() - 1}-01-01`;

  const [{ data: entriesData }, { data: goalsData }] = await Promise.all([
    supabase
      .from("metric_entries")
      .select("*")
      .eq("business_id", business.id)
      .gte("date", priorYearStart)
      .order("date", { ascending: true })
      .limit(10000),
    supabase.from("goals").select("*").eq("business_id", business.id),
  ]);

  const entries = (entriesData ?? []) as MetricEntry[];
  const goals = (goalsData ?? []) as Goal[];
  const currency = business.currency;

  const kpi = getKpiData(entries);
  const trend = getMonthlyTrend(entries);
  const breakdown = getServiceBreakdown(entries);
  const summary = getMonthlySummary(entries);

  const revenueGoal = goals.find((goal) => goal.metric === "revenue");
  const leadsGoal = goals.find((goal) => goal.metric === "leads");
  const jobsGoal = goals.find((goal) => goal.metric === "jobs");

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader businessName={business.business_name} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="This Month Revenue"
          value={formatCurrency(kpi.revenue.thisMonth, currency)}
          change={kpi.revenue.change}
          accent={business.brand_colour || "#00C4CC"}
          goal={goalProgress(revenueGoal, kpi.revenue.thisMonth, (value) =>
            formatCurrency(value, currency)
          )}
        />
        <KpiCard
          label="This Month Leads"
          value={String(kpi.leads.thisMonth)}
          change={kpi.leads.change}
          accent="#3B82F6"
          goal={goalProgress(leadsGoal, kpi.leads.thisMonth, (value) =>
            String(Math.round(value))
          )}
        />
        <KpiCard
          label="Jobs Completed"
          value={String(kpi.jobs.thisMonth)}
          change={kpi.jobs.change}
          accent="#6366F1"
          goal={goalProgress(jobsGoal, kpi.jobs.thisMonth, (value) =>
            String(Math.round(value))
          )}
        />
        <KpiCard
          label="Avg Job Value"
          value={
            kpi.jobs.thisMonth > 0
              ? formatCurrency(kpi.avgJobValue.thisMonth, currency)
              : "--"
          }
          change={kpi.avgJobValue.change}
          accent="#22C55E"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart
            data={trend}
            currency={currency}
            colour={business.brand_colour || "#00C4CC"}
          />
        </div>
        <div className="lg:col-span-2">
          <ServiceBreakdownChart data={breakdown} currency={currency} />
        </div>
      </div>

      <LeadsChart data={trend} />

      <MonthlySummaryTable rows={summary} currency={currency} />
    </div>
  );
}
