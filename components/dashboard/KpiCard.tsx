import { formatPercent } from "../../lib/format";

type Props = {
  label: string;
  value: string;
  change: number | null;
  accent: string;
  goal?: {
    text: string;
    percent: number;
  };
};

export default function KpiCard({ label, value, change, accent, goal }: Props) {
  const rounded = change === null ? null : Math.round(change);

  return (
    <div
      className="rounded-xl border-t-4 bg-white p-5 shadow-sm"
      style={{ borderTopColor: accent }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
        {rounded !== null && (
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              rounded > 0
                ? "bg-green-50 text-green-700"
                : rounded < 0
                  ? "bg-red-50 text-red-600"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {rounded > 0 && (
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                <path d="M6 2l4 5H2l4-5z" />
              </svg>
            )}
            {rounded < 0 && (
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                <path d="M6 10L2 5h8l-4 5z" />
              </svg>
            )}
            {formatPercent(rounded)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
      {goal && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, goal.percent))}%`,
                backgroundColor: accent,
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{goal.text}</p>
        </div>
      )}
    </div>
  );
}
