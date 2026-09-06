"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Plus, Save, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatPence } from "@/lib/format";
import { deposit, lineTotal, totals } from "@/lib/quotes";
import type { PriceItem, Quote, QuoteLine } from "@/lib/types";

import { deleteDraftAction, saveQuoteAction, sendQuoteAction, type QuoteState } from "../actions";

const initial: QuoteState = { error: null };
const initialSend: QuoteState & { mailto?: string | null } = { error: null };

/**
 * The quote builder. Lines are held in local state and posted as JSON, so
 * adding a line does not round-trip. Picking a price list item copies its
 * name, kind and price into a new line; from-priced items are expected to be
 * edited to the real figure.
 */
export function QuoteBuilder({ quote, priceItems }: { quote: Quote; priceItems: PriceItem[] }) {
  const [lines, setLines] = useState<QuoteLine[]>(quote.lines);
  const [pick, setPick] = useState("");
  const [saveState, saveAction, saving] = useActionState(saveQuoteAction, initial);
  const [sendState, sendAction, sending] = useActionState(sendQuoteAction, initialSend);
  const [delState, delAction, deleting] = useActionState(deleteDraftAction, initial);

  const sums = useMemo(() => totals(lines), [lines]);
  const dep = useMemo(() => deposit({ lines, deposit_pct: quote.deposit_pct }), [lines, quote.deposit_pct]);

  // The send action hands back a mailto when this app cannot email itself.
  useEffect(() => {
    if (sendState.mailto) window.location.href = sendState.mailto;
  }, [sendState.mailto]);

  function addFromList(id: string) {
    const item = priceItems.find((entry) => entry.id === id);
    if (!item) return;
    setLines([...lines, { description: item.name, kind: item.kind, unit_pence: item.price_pence, quantity: 1 }]);
    setPick("");
  }

  function update(index: number, patch: Partial<QuoteLine>) {
    setLines(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  const linesJson = JSON.stringify(lines);

  return (
    <div className="space-y-6">
      <form action={saveAction} className="space-y-5" id="quote-form">
        <input type="hidden" name="id" value={quote.id} />
        <input type="hidden" name="lines" value={linesJson} />

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={quote.title} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="to_name">Prepared for</Label>
            <Input id="to_name" name="to_name" defaultValue={quote.to_name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to_business">Business</Label>
            <Input id="to_business" name="to_business" defaultValue={quote.to_business ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to_email">Email</Label>
            <Input id="to_email" name="to_email" type="email" defaultValue={quote.to_email ?? ""} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="intro">Overview, optional</Label>
          <Textarea id="intro" name="intro" rows={3} defaultValue={quote.intro ?? ""} placeholder="Two or three sentences on what is being built and what it is for." />
        </div>

        <div className="space-y-3">
          <Label>Lines</Label>
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet. Pick from the price list below or add a line by hand.</p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line, index) => (
                <li key={index} className="rounded-xl border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_7rem_5rem_6.5rem_auto] sm:items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`d-${index}`} className="text-xs text-muted-foreground">
                        Description
                      </Label>
                      <Input id={`d-${index}`} value={line.description} onChange={(e) => update(index, { description: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`k-${index}`} className="text-xs text-muted-foreground">
                        Type
                      </Label>
                      <NativeSelect id={`k-${index}`} value={line.kind} onChange={(e) => update(index, { kind: e.target.value as QuoteLine["kind"] })}>
                        <option value="one_off">One-off</option>
                        <option value="monthly">Monthly</option>
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`q-${index}`} className="text-xs text-muted-foreground">
                        Qty
                      </Label>
                      <Input
                        id={`q-${index}`}
                        inputMode="decimal"
                        value={String(line.quantity)}
                        onChange={(e) => update(index, { quantity: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`p-${index}`} className="text-xs text-muted-foreground">
                        Unit £
                      </Label>
                      <Input
                        id={`p-${index}`}
                        inputMode="decimal"
                        value={(line.unit_pence / 100).toString()}
                        onChange={(e) => update(index, { unit_pence: Math.round((Number(e.target.value.replace(/[£,]/g, "")) || 0) * 100) })}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove line" onClick={() => setLines(lines.filter((_, i) => i !== index))}>
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="mt-2 text-right text-sm text-muted-foreground tabular-nums">
                    {formatPence(lineTotal(line))}
                    {line.kind === "monthly" ? " a month" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1 space-y-1">
              <Label htmlFor="pick" className="text-xs text-muted-foreground">
                Add from the price list
              </Label>
              <NativeSelect id="pick" value={pick} onChange={(e) => addFromList(e.target.value)}>
                <option value="">Choose an item</option>
                {priceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}, {item.from_price ? "from " : ""}
                    {formatPence(item.price_pence)}
                    {item.kind === "monthly" ? " a month" : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="button" variant="outline" onClick={() => setLines([...lines, { description: "", kind: "one_off", unit_pence: 0, quantity: 1 }])}>
              <Plus data-icon="inline-start" />
              Blank line
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">One-off total</span>
            <span className="font-semibold text-navy tabular-nums">{formatPence(sums.oneOff)}</span>
          </div>
          {sums.monthly > 0 ? (
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Monthly total</span>
              <span className="font-semibold text-navy tabular-nums">{formatPence(sums.monthly)} a month</span>
            </div>
          ) : null}
          {sums.oneOff > 0 ? (
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>Deposit {quote.deposit_pct}%</span>
              <span className="tabular-nums">
                {formatPence(dep.depositPence)}, then {formatPence(dep.balancePence)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deposit_pct">Deposit %</Label>
            <Input id="deposit_pct" name="deposit_pct" inputMode="numeric" defaultValue={quote.deposit_pct} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valid_days">Valid for, days</Label>
            <Input id="valid_days" name="valid_days" inputMode="numeric" defaultValue={quote.valid_days} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="not_included">Not included</Label>
          <Textarea id="not_included" name="not_included" rows={4} defaultValue={quote.not_included ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeline">Timeline, optional</Label>
          <Textarea id="timeline" name="timeline" rows={3} defaultValue={quote.timeline ?? ""} placeholder="First draft within 10 working days of the deposit and content arriving. Live about a week after sign-off." />
        </div>

        <FormMessage error={saveState.error} ok={saveState.ok} />
        <Button type="submit" variant="outline" disabled={saving}>
          <Save data-icon="inline-start" />
          {saving ? "Saving..." : "Save draft"}
        </Button>
      </form>

      <div className="rounded-xl border border-cyan-action/30 bg-cyan-action/5 p-4">
        <p className="text-sm text-muted-foreground">
          Save first. Send builds the PDF, emails it to {quote.to_email || "the address above"} with the PDF attached, marks the quote sent and the enquiry quoted.
        </p>
        <form action={sendAction} className="mt-3">
          <input type="hidden" name="id" value={quote.id} />
          <FormMessage error={sendState.error} ok={sendState.ok} />
          <Button type="submit" size="lg" disabled={sending || lines.length === 0} className="mt-2 w-full sm:w-auto">
            <Send data-icon="inline-start" />
            {sending ? "Building the PDF..." : "Send quote"}
          </Button>
        </form>
      </div>

      <form action={delAction} onSubmit={(e) => { if (!window.confirm("Delete this draft?")) e.preventDefault(); }}>
        <input type="hidden" name="id" value={quote.id} />
        <FormMessage error={delState.error} />
        <Button type="submit" variant="ghost" size="sm" disabled={deleting} className="text-destructive hover:text-destructive">
          <Trash2 data-icon="inline-start" />
          Delete draft
        </Button>
      </form>
    </div>
  );
}
