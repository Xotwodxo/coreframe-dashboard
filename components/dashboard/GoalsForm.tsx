"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { currencySymbol } from "../../lib/format";
import type { Goal } from "../../lib/types";

type Metric = "revenue" | "leads" | "jobs";

type Props = {
  businessId: string | null;
  currency: string;
  goals: Goal[];
  onSaved: (goals: Goal[]) => void;
};

export default function GoalsForm({
  businessId,
  currency,
  goals,
  onSaved,
}: Props) {
  const [targets, setTargets] = useState<Record<Metric, string>>({
    revenue: "",
    leads: "",
    jobs: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargets({
      revenue: String(goals.find((g) => g.metric === "revenue")?.target ?? ""),
      leads: String(goals.find((g) => g.metric === "leads")?.target ?? ""),
      jobs: String(goals.find((g) => g.metric === "jobs")?.target ?? ""),
    });
  }, [goals]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!businessId) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const metrics: Metric[] = ["revenue", "leads", "jobs"];
    const toUpsert = metrics
      .filter((metric) => Number(targets[metric]) > 0)
      .map((metric) => ({
        business_id: businessId,
        metric,
        target: Number(targets[metric]),
        period: "monthly",
      }));
    const toRemove = metrics.filter(
      (metric) =>
        !(Number(targets[metric]) > 0) &&
        goals.some((goal) => goal.metric === metric)
    );

    let failed = false;
    let saved: Goal[] = [];

    if (toUpsert.length > 0) {
      const { data, error: upsertError } = await supabase
        .from("goals")
        .upsert(toUpsert, { onConflict: "business_id,metric" })
        .select();
      if (upsertError) {
        failed = true;
        setError(upsertError.message);
      } else {
        saved = (data ?? []) as Goal[];
      }
    }

    if (!failed && toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from("goals")
        .delete()
        .eq("business_id", businessId)
        .in("metric", toRemove);
      if (deleteError) {
        failed = true;
        setError(deleteError.message);
      }
    }

    setSaving(false);
    if (!failed) {
      onSaved(saved);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-slate-50";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-sm font-semibold text-slate-700">Monthly goals</h2>
      <p className="mt-1 text-sm text-slate-500">
        Set targets to see progress bars on your dashboard KPI cards. Leave a
        field empty to remove that goal.
      </p>
      {!businessId && (
        <p className="mt-3 text-sm text-slate-500">
          Save your business details first, then set your goals.
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="goal-revenue"
            className="block text-sm font-medium text-slate-700"
          >
            Monthly revenue target ({currencySymbol(currency)})
          </label>
          <input
            id="goal-revenue"
            type="number"
            min="0"
            step="0.01"
            disabled={!businessId}
            value={targets.revenue}
            onChange={(event) =>
              setTargets({ ...targets, revenue: event.target.value })
            }
            placeholder="e.g. 15000"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="goal-leads"
            className="block text-sm font-medium text-slate-700"
          >
            Monthly leads target
          </label>
          <input
            id="goal-leads"
            type="number"
            min="0"
            step="1"
            disabled={!businessId}
            value={targets.leads}
            onChange={(event) =>
              setTargets({ ...targets, leads: event.target.value })
            }
            placeholder="e.g. 40"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="goal-jobs"
            className="block text-sm font-medium text-slate-700"
          >
            Monthly jobs target
          </label>
          <input
            id="goal-jobs"
            type="number"
            min="0"
            step="1"
            disabled={!businessId}
            value={targets.jobs}
            onChange={(event) =>
              setTargets({ ...targets, jobs: event.target.value })
            }
            placeholder="e.g. 30"
            className={inputClass}
          />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving || !businessId}
        className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save goals"}
      </button>
    </form>
  );
}
