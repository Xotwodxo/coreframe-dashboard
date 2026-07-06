"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { currencySymbol } from "../../lib/format";
import type { Category, MetricEntry } from "../../lib/types";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "lead", label: "Lead" },
  { value: "booking", label: "Booking" },
  { value: "job_completed", label: "Job Completed" },
  { value: "expense", label: "Expense" },
  { value: "other", label: "Other" },
];

const LABEL_PLACEHOLDERS: Record<Category, string> = {
  revenue: "Service name, e.g. Boiler repair",
  lead: "Lead source, e.g. Google",
  booking: "Service or source, e.g. Website form",
  job_completed: "Service name, e.g. Rewire",
  expense: "Expense type, e.g. Materials",
  other: "Label",
};

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type Props = {
  businessId: string;
  currency: string;
  onAdded: (entry: MetricEntry) => void;
  onCancel: () => void;
};

export default function AddEntryForm({
  businessId,
  currency,
  onAdded,
  onCancel,
}: Props) {
  const [date, setDate] = useState(todayIso());
  const [category, setCategory] = useState<Category>("revenue");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMoney = category === "revenue" || category === "expense";
  const valueLabel = isMoney
    ? `Amount (${currencySymbol(currency)})`
    : "Count (usually 1)";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("metric_entries")
      .insert({
        business_id: businessId,
        date,
        category,
        value: Number(value),
        label: label.trim() || null,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      onAdded(data as MetricEntry);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-sm font-semibold text-slate-700">Add entry</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label
            htmlFor="entry-date"
            className="block text-sm font-medium text-slate-700"
          >
            Date
          </label>
          <input
            id="entry-date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="entry-category"
            className="block text-sm font-medium text-slate-700"
          >
            Category
          </label>
          <select
            id="entry-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as Category)}
            className={inputClass}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="entry-value"
            className="block text-sm font-medium text-slate-700"
          >
            {valueLabel}
          </label>
          <input
            id="entry-value"
            type="number"
            required
            min="0"
            step={isMoney ? "0.01" : "1"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={isMoney ? "0.00" : "1"}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="entry-label"
            className="block text-sm font-medium text-slate-700"
          >
            Label <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="entry-label"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={LABEL_PLACEHOLDERS[category]}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="entry-notes"
            className="block text-sm font-medium text-slate-700"
          >
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="entry-notes"
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything worth remembering"
            className={inputClass}
          />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save entry"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
