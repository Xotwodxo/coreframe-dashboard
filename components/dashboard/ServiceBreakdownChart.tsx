"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ServiceBreakdown } from "../../lib/types";
import { formatCurrency } from "../../lib/format";

const CHART_COLOURS = [
  "#00C4CC",
  "#1A2332",
  "#4ECDC4",
  "#2D4A6E",
  "#88D8D5",
  "#94A3B8",
];

type Props = {
  data: ServiceBreakdown[];
  currency: string;
};

export default function ServiceBreakdownChart({ data, currency }: Props) {
  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-slate-700">
        Revenue by Service
      </h2>
      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="max-w-55 text-center text-sm text-slate-500">
            Add service labels to your entries to see this breakdown
          </p>
        </div>
      ) : (
        <div className="mt-2 min-h-80 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((item, index) => (
                  <Cell
                    key={item.label}
                    fill={CHART_COLOURS[index % CHART_COLOURS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value), currency),
                  String(name),
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: "#475569" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
