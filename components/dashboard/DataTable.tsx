"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Category, MetricEntry } from "../../lib/types";

const PAGE_SIZE = 50;

const CATEGORY_BADGES: Record<Category, { label: string; className: string }> =
  {
    revenue: { label: "Revenue", className: "bg-green-100 text-green-700" },
    lead: { label: "Lead", className: "bg-cyan-100 text-navy" },
    booking: { label: "Booking", className: "bg-blue-500 text-white" },
    job_completed: {
      label: "Job Completed",
      className: "bg-indigo-500 text-white",
    },
    expense: { label: "Expense", className: "bg-red-500 text-white" },
    other: { label: "Other", className: "bg-slate-100 text-slate-600" },
  };

const CATEGORY_OPTIONS: Category[] = [
  "revenue",
  "lead",
  "booking",
  "job_completed",
  "expense",
  "other",
];

type Draft = {
  date: string;
  category: Category;
  value: string;
  label: string;
  notes: string;
};

type Props = {
  entries: MetricEntry[];
  currency: string;
  onUpdate: (id: string, patch: Partial<MetricEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function DataTable({
  entries,
  currency,
  onUpdate,
  onDelete,
}: Props) {
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageEntries = entries.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl bg-white px-6 py-14 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M1.5 5.625c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v12.75c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 18.375V5.625zM21 9.375A.375.375 0 0020.625 9h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 00.375-.375v-1.5zm0 3.75a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 00.375-.375v-1.5zm0 3.75a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 00.375-.375v-1.5zM10.875 18.75a.375.375 0 00.375-.375v-1.5a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5zM3.375 15h7.5a.375.375 0 00.375-.375v-1.5a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375zm0-3.75h7.5a.375.375 0 00.375-.375v-1.5A.375.375 0 0010.875 9h-7.5A.375.375 0 003 9.375v1.5c0 .207.168.375.375.375z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-700">No data yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Add your first entry or import a CSV to get started.
        </p>
      </div>
    );
  }

  function startEdit(entry: MetricEntry) {
    setConfirmingId(null);
    setEditingId(entry.id);
    setDraft({
      date: entry.date,
      category: entry.category,
      value: String(entry.value),
      label: entry.label ?? "",
      notes: entry.notes ?? "",
    });
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    setBusy(true);
    await onUpdate(id, {
      date: draft.date,
      category: draft.category,
      value: Number(draft.value),
      label: draft.label.trim() || null,
      notes: draft.notes.trim() || null,
    });
    setBusy(false);
    setEditingId(null);
    setDraft(null);
  }

  async function confirmDelete(id: string) {
    setBusy(true);
    await onDelete(id);
    setBusy(false);
    setConfirmingId(null);
  }

  const editInputClass =
    "w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-brand focus:outline-none";

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-175 text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3 sm:px-6">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-5 py-3 text-right sm:px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageEntries.map((entry) => {
              const badge = CATEGORY_BADGES[entry.category];
              const isMoney =
                entry.category === "revenue" || entry.category === "expense";

              if (editingId === entry.id && draft) {
                return (
                  <tr key={entry.id} className="border-b border-slate-100 bg-brand/5">
                    <td className="px-5 py-2.5 sm:px-6">
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(event) =>
                          setDraft({ ...draft, date: event.target.value })
                        }
                        className={editInputClass}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={draft.category}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            category: event.target.value as Category,
                          })
                        }
                        className={editInputClass}
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {CATEGORY_BADGES[option].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        step="0.01"
                        value={draft.value}
                        onChange={(event) =>
                          setDraft({ ...draft, value: event.target.value })
                        }
                        className={`${editInputClass} text-right`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={draft.label}
                        onChange={(event) =>
                          setDraft({ ...draft, label: event.target.value })
                        }
                        className={editInputClass}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={draft.notes}
                        onChange={(event) =>
                          setDraft({ ...draft, notes: event.target.value })
                        }
                        className={editInputClass}
                      />
                    </td>
                    <td className="px-5 py-2.5 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => saveEdit(entry.id)}
                          disabled={busy}
                          className="rounded bg-brand px-2.5 py-1 text-xs font-semibold text-navy hover:opacity-90 disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setDraft(null);
                          }}
                          className="rounded px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={entry.id}
                  className="border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-5 py-3 text-slate-700 sm:px-6">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800">
                    {isMoney
                      ? formatCurrency(entry.value, currency)
                      : entry.value}
                  </td>
                  <td className="max-w-45 truncate px-4 py-3 text-slate-600">
                    {entry.label ?? ""}
                  </td>
                  <td className="max-w-55 truncate px-4 py-3 text-slate-500">
                    {entry.notes ?? ""}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right sm:px-6">
                    {confirmingId === entry.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-slate-600">
                          Delete this entry?
                        </span>
                        <button
                          onClick={() => confirmDelete(entry.id)}
                          disabled={busy}
                          className="rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(entry)}
                          aria-label="Edit entry"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            className="h-4 w-4"
                            fill="currentColor"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setConfirmingId(entry.id);
                          }}
                          aria-label="Delete entry"
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            className="h-4 w-4"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 sm:px-6">
          <p className="text-xs text-slate-500">
            Page {currentPage + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
