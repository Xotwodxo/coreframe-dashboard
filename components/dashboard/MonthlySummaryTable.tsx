import type { MonthlySummary } from "../../lib/types";
import { formatCurrency, formatPercent } from "../../lib/format";

type Props = {
  rows: MonthlySummary[];
  currency: string;
};

export default function MonthlySummaryTable({ rows, currency }: Props) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-slate-700">
        Monthly Breakdown
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-130 text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2.5 pr-4">Month</th>
              <th className="py-2.5 pr-4 text-right">Revenue</th>
              <th className="py-2.5 pr-4 text-right">Leads</th>
              <th className="py-2.5 pr-4 text-right">Jobs</th>
              <th className="py-2.5 pr-4 text-right">Avg Job Value</th>
              <th className="py-2.5 text-right">Revenue vs Prior Month</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const change =
                row.revenueChange === null
                  ? null
                  : Math.round(row.revenueChange);
              return (
                <tr
                  key={row.month}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="py-2.5 pr-4 font-medium text-slate-800">
                    {row.month}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-slate-700">
                    {formatCurrency(row.revenue, currency)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-slate-700">
                    {row.leads}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-slate-700">
                    {row.jobs}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-slate-700">
                    {row.jobs > 0
                      ? formatCurrency(row.avgJobValue, currency)
                      : "--"}
                  </td>
                  <td className="py-2.5 text-right">
                    {change === null ? (
                      <span className="text-slate-400">--</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-0.5 font-medium ${
                          change > 0
                            ? "text-green-600"
                            : change < 0
                              ? "text-red-600"
                              : "text-slate-500"
                        }`}
                      >
                        {change > 0 && (
                          <svg
                            viewBox="0 0 12 12"
                            className="h-3 w-3"
                            fill="currentColor"
                          >
                            <path d="M6 2l4 5H2l4-5z" />
                          </svg>
                        )}
                        {change < 0 && (
                          <svg
                            viewBox="0 0 12 12"
                            className="h-3 w-3"
                            fill="currentColor"
                          >
                            <path d="M6 10L2 5h8l-4 5z" />
                          </svg>
                        )}
                        {formatPercent(change)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
