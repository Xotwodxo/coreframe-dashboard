"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import type { Business } from "../../lib/types";

const CURRENCIES = ["GBP", "EUR", "USD", "CAD", "AUD"];
const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

type Props = {
  business: Business | null;
  onboarding: boolean;
  onSaved: (business: Business) => void;
};

export default function SettingsForm({ business, onboarding, onSaved }: Props) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [brandColour, setBrandColour] = useState("#00C4CC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      setBusinessName(business.business_name);
      setBusinessType(business.business_type);
      setCurrency(business.currency);
      setBrandColour(business.brand_colour);
    }
  }, [business]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!HEX_COLOUR.test(brandColour)) {
      setError("Brand colour must be a hex code like #00C4CC");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      business_name: businessName.trim(),
      business_type: businessType.trim(),
      currency,
      brand_colour: brandColour,
    };

    let saved: Business | null = null;

    if (business) {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", business.id)
        .select()
        .single();
      if (updateError) {
        setError(updateError.message);
      } else {
        saved = data as Business;
      }
    } else {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Could not save your details");
      } else {
        saved = body.business as Business;
      }
    }

    setSaving(false);
    if (saved) {
      onSaved(saved);
      router.refresh();
      if (onboarding) {
        router.push("/dashboard");
      }
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-sm font-semibold text-slate-700">
        Business details
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="business-name"
            className="block text-sm font-medium text-slate-700"
          >
            Business name
          </label>
          <input
            id="business-name"
            type="text"
            required
            autoFocus={onboarding}
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="e.g. Bright Spark Electrical"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="business-type"
            className="block text-sm font-medium text-slate-700"
          >
            Business type
          </label>
          <input
            id="business-type"
            type="text"
            required
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            placeholder="e.g. Electrical Contractor"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="business-currency"
            className="block text-sm font-medium text-slate-700"
          >
            Currency
          </label>
          <select
            id="business-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className={inputClass}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="brand-colour"
            className="block text-sm font-medium text-slate-700"
          >
            Brand colour
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              aria-label="Brand colour swatch"
              value={HEX_COLOUR.test(brandColour) ? brandColour : "#00C4CC"}
              onChange={(event) => setBrandColour(event.target.value)}
              className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
            />
            <input
              id="brand-colour"
              type="text"
              value={brandColour}
              onChange={(event) => setBrandColour(event.target.value)}
              placeholder="#00C4CC"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Used on your KPI card borders and chart bars
          </p>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
