"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import Papa from "papaparse";
import { createClient } from "../../lib/supabase/client";
import type { Category, MetricEntry } from "../../lib/types";

const CATEGORY_MAP: Record<string, Category> = {
  revenue: "revenue",
  lead: "lead",
  booking: "booking",
  job: "job_completed",
  "job completed": "job_completed",
  job_completed: "job_completed",
  expense: "expense",
  other: "other",
};

type ParsedRow = {
  date: string;
  category: Category;
  value: number;
  label: string | null;
  notes: string | null;
};

type RowError = {
  row: number;
  message: string;
};

type PreviewRow = Record<string, string>;

// Accepts DD/MM/YYYY or YYYY-MM-DD, returns YYYY-MM-DD or null
function normaliseDate(raw: string): string | null {
  const trimmed = raw.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);

  let year: number, month: number, day: number;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (uk) {
    day = Number(uk[1]);
    month = Number(uk[2]);
    year = Number(uk[3]);
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type Props = {
  businessId: string;
  onImported: (entries: MetricEntry[], skipped: number) => void;
};

export default function CsvUploader({ businessId, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validRows, setValidRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileName(null);
    setValidRows([]);
    setErrors([]);
    setPreview([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function parseFile(file: File) {
    reset();
    setFileName(file.name);

    Papa.parse<PreviewRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const valid: ParsedRow[] = [];
        const rowErrors: RowError[] = [];

        results.data.forEach((row, index) => {
          // +2 accounts for the header line and 1-based numbering
          const rowNumber = index + 2;

          const date = normaliseDate(row.date ?? "");
          if (!date) {
            rowErrors.push({
              row: rowNumber,
              message: `Bad date "${row.date ?? ""}". Use DD/MM/YYYY or YYYY-MM-DD.`,
            });
            return;
          }

          const category =
            CATEGORY_MAP[(row.category ?? "").trim().toLowerCase()];
          if (!category) {
            rowErrors.push({
              row: rowNumber,
              message: `Unknown category "${row.category ?? ""}". Use revenue, lead, booking, job, expense, or other.`,
            });
            return;
          }

          const value = Number((row.value ?? "").trim());
          if (!Number.isFinite(value)) {
            rowErrors.push({
              row: rowNumber,
              message: `Value "${row.value ?? ""}" is not a number.`,
            });
            return;
          }

          valid.push({
            date,
            category,
            value,
            label: row.label?.trim() || null,
            notes: row.notes?.trim() || null,
          });
        });

        setPreview(results.data.slice(0, 5));
        setValidRows(valid);
        setErrors(rowErrors);
      },
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".csv")) {
      parseFile(file);
    }
  }

  async function handleConfirm() {
    setImporting(true);
    const supabase = createClient();
    const inserted: MetricEntry[] = [];
    let failed = 0;

    for (let start = 0; start < validRows.length; start += 500) {
      const batch = validRows.slice(start, start + 500);
      const { data, error } = await supabase
        .from("metric_entries")
        .insert(batch.map((row) => ({ ...row, business_id: businessId })))
        .select();

      if (error) {
        failed += batch.length;
      } else {
        inserted.push(...((data ?? []) as MetricEntry[]));
      }
    }

    setImporting(false);
    const skipped = errors.length + failed;
    setResult(
      `${inserted.length} ${inserted.length === 1 ? "entry" : "entries"} imported.${
        skipped > 0 ? ` ${skipped} skipped (see errors above).` : ""
      }`
    );
    setValidRows([]);
    setPreview([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImported(inserted, skipped);
  }

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-slate-700 sm:px-6"
      >
        <span className="flex items-center gap-2">
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4 text-slate-400"
            fill="currentColor"
          >
            <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Import from CSV
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragging
                ? "border-brand bg-brand/5"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 text-slate-400"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
                clipRule="evenodd"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-slate-700">
              Drag and drop your CSV here
            </p>
            <p className="mt-1 text-xs text-slate-500">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="mt-4 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Expected format:</p>
            <pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700">
{`Date,Category,Value,Label,Notes
15/07/2025,revenue,850,Boiler repair,Emergency callout
16/07/2025,lead,1,Google,`}
            </pre>
            <p className="mt-2">
              Accepted categories: revenue, lead, booking, job, expense, other
            </p>
            <p className="mt-0.5">
              Accepted date formats: DD/MM/YYYY or YYYY-MM-DD
            </p>
          </div>

          {errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700">
                {errors.length} {errors.length === 1 ? "row" : "rows"} with
                problems (these will be skipped):
              </p>
              <ul className="mt-1.5 max-h-32 space-y-0.5 overflow-y-auto text-xs text-red-600">
                {errors.map((error) => (
                  <li key={`${error.row}-${error.message}`}>
                    Row {error.row}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fileName && preview.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-600">
                Preview of {fileName} (first 5 rows):
              </p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-500">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Value</th>
                      <th className="px-3 py-2 font-medium">Label</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr
                        key={index}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2">{row.category}</td>
                        <td className="px-3 py-2">{row.value}</td>
                        <td className="px-3 py-2">{row.label}</td>
                        <td className="px-3 py-2">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">
                Ready to import {validRows.length}{" "}
                {validRows.length === 1 ? "entry" : "entries"}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleConfirm}
                  disabled={importing || validRows.length === 0}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {importing ? "Importing..." : "Confirm import"}
                </button>
                <button
                  onClick={reset}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {result && (
            <p className="mt-4 text-sm font-medium text-slate-700">{result}</p>
          )}
        </div>
      )}
    </div>
  );
}
