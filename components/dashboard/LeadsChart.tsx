"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTrend } from "../../lib/types";

type Props = {
  data: MonthlyTrend[];
};

export default function LeadsChart({ data }: Props) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-slate-700">Monthly Leads</h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
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
              width={36}
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <Tooltip
              formatter={(value) => [Number(value), "Leads"]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 13,
              }}
            />
            <Line
              type="monotone"
              dataKey="leads"
              stroke="#1A2332"
              strokeWidth={2}
              dot={{ r: 3, fill: "#1A2332", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
