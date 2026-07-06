import {
  getKpiData,
  getMonthlySummary,
  getMonthlyTrend,
} from "../../lib/calculations";
import {
  demoBusiness,
  demoServiceBreakdown,
  getDemoEntries,
} from "../../lib/demo-data";
import { formatCurrency } from "../../lib/format";
import DashboardHeader from "../layout/DashboardHeader";
import KpiCard from "../dashboard/KpiCard";
import RevenueChart from "../dashboard/RevenueChart";
import LeadsChart from "../dashboard/LeadsChart";
import ServiceBreakdownChart from "../dashboard/ServiceBreakdownChart";
import MonthlySummaryTable from "../dashboard/MonthlySummaryTable";

// Full dashboard UI driven entirely by hardcoded demo data. No DB calls.
export default function DemoDashboard() {
  const entries = getDemoEntries();
  const currency = demoBusiness.currency;

  const kpi = getKpiData(entries);
  const trend = getMonthlyTrend(entries);
  const summary = getMonthlySummary(entries);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <DashboardHeader businessName={demoBusiness.business_name} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="This Month Revenue"
          value={formatCurrency(kpi.revenue.thisMonth, currency)}
          change={kpi.revenue.change}
          accent="#00C4CC"
        />
        <KpiCard
          label="This Month Leads"
          value={String(kpi.leads.thisMonth)}
          change={kpi.leads.change}
          accent="#3B82F6"
        />
        <KpiCard
          label="Jobs Completed"
          value={String(kpi.jobs.thisMonth)}
          change={kpi.jobs.change}
          accent="#6366F1"
        />
        <KpiCard
          label="Avg Job Value"
          value={
            kpi.avgJobValue.thisMonth > 0
              ? formatCurrency(kpi.avgJobValue.thisMonth, currency)
              : "--"
          }
          change={kpi.avgJobValue.change}
          accent="#22C55E"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart data={trend} currency={currency} />
        </div>
        <div className="lg:col-span-2">
          <ServiceBreakdownChart
            data={demoServiceBreakdown}
            currency={currency}
          />
        </div>
      </div>

      <LeadsChart data={trend} />

      <MonthlySummaryTable rows={summary} currency={currency} />
    </div>
  );
}
