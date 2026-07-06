"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import { formatDate } from "../../../lib/format";
import type { Business, MetricEntry } from "../../../lib/types";
import AddEntryForm from "../../../components/dashboard/AddEntryForm";
import CsvUploader from "../../../components/dashboard/CsvUploader";
import DataTable from "../../../components/dashboard/DataTable";
import Toast from "../../../components/ui/Toast";

function sortEntries(entries: MetricEntry[]): MetricEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
  );
}

export default function DataPage() {
  const supabase = useMemo(createClient, []);
  const [business, setBusiness] = useState<Business | null>(null);
  const [entries, setEntries] = useState<MetricEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: businessRow } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setBusiness(businessRow as Business | null);

      if (businessRow) {
        const { data: entryRows } = await supabase
          .from("metric_entries")
          .select("*")
          .eq("business_id", businessRow.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10000);
        if (cancelled) return;
        setEntries((entryRows ?? []) as MetricEntry[]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleAdded = useCallback((entry: MetricEntry) => {
    setEntries((current) => sortEntries([entry, ...current]));
    setShowForm(false);
    setToast("Entry added");
  }, []);

  const handleImported = useCallback(
    (imported: MetricEntry[], skipped: number) => {
      if (imported.length === 0 && skipped === 0) return;
      setEntries((current) => sortEntries([...imported, ...current]));
      setToast(
        `${imported.length} ${imported.length === 1 ? "entry" : "entries"} imported${
          skipped > 0 ? `, ${skipped} skipped` : ""
        }`
      );
    },
    []
  );

  const handleUpdate = useCallback(
    async (id: string, patch: Partial<MetricEntry>) => {
      const { data, error } = await supabase
        .from("metric_entries")
        .update(patch)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        setEntries((current) =>
          sortEntries(
            current.map((entry) =>
              entry.id === id ? (data as MetricEntry) : entry
            )
          )
        );
        setToast("Entry updated");
      }
    },
    [supabase]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("metric_entries")
        .delete()
        .eq("id", id);

      if (!error) {
        setEntries((current) => current.filter((entry) => entry.id !== id));
        setToast("Entry deleted");
      }
    },
    [supabase]
  );

  if (loading) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div className="h-7 w-40 rounded bg-slate-200" />
        <div className="h-16 rounded-xl bg-white shadow-sm" />
        <div className="h-96 rounded-xl bg-white shadow-sm" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-700">
          Set up your business details first.
        </p>
        <Link
          href="/dashboard/settings?onboarding=true"
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-navy hover:opacity-90"
        >
          Go to settings
        </Link>
      </div>
    );
  }

  const newestDate = entries[0]?.date;
  const oldestDate = entries[entries.length - 1]?.date;
  const lastAdded = entries.reduce<string | null>(
    (latest, entry) =>
      !latest || entry.created_at > latest ? entry.created_at : latest,
    null
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Data
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add entry
        </button>
      </div>

      {/* Summary stats bar */}
      <div className="grid grid-cols-1 divide-y divide-slate-100 rounded-xl bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total entries
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {entries.length}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Date range
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {oldestDate && newestDate
              ? `${formatDate(oldestDate)} to ${formatDate(newestDate)}`
              : "--"}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Last entry added
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {lastAdded ? formatDate(lastAdded.slice(0, 10)) : "--"}
          </p>
        </div>
      </div>

      {showForm && (
        <AddEntryForm
          businessId={business.id}
          currency={business.currency}
          onAdded={handleAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      <CsvUploader businessId={business.id} onImported={handleImported} />

      <DataTable
        entries={entries}
        currency={business.currency}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
