"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTrend } from "../../lib/types";
import { currencySymbol, formatCurrency } from "../../lib/format";

type Props = {
  data: MonthlyTrend[];
  currency: string;
  colour?: string;
};

export default function RevenueChart({ data, currency, colour }: Props) {
  const symbol = currencySymbol(currency);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-slate-700">Monthly Revenue</h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickFormatter={(value: number) =>
                value >= 1000
                  ? `${symbol}${Math.round(value / 1000)}k`
                  : `${symbol}${value}`
              }
            />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              formatter={(value) => [
                formatCurrency(Number(value), currency),
                "Revenue",
              ]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 13,
              }}
            />
            <Bar
              dataKey="revenue"
              fill={colour ?? "#00C4CC"}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
