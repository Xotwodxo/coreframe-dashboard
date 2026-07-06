"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import type { Business, Goal } from "../../../lib/types";
import SettingsForm from "../../../components/dashboard/SettingsForm";
import GoalsForm from "../../../components/dashboard/GoalsForm";
import Toast from "../../../components/ui/Toast";

function SettingsContent() {
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "true";

  const supabase = useMemo(createClient, []);
  const [business, setBusiness] = useState<Business | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
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
        const { data: goalRows } = await supabase
          .from("goals")
          .select("*")
          .eq("business_id", businessRow.id);
        if (cancelled) return;
        setGoals((goalRows ?? []) as Goal[]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex animate-pulse flex-col gap-6">
        <div className="h-7 w-40 rounded bg-slate-200" />
        <div className="h-72 rounded-xl bg-white shadow-sm" />
        <div className="h-56 rounded-xl bg-white shadow-sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Settings
      </h1>

      {onboarding && (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-5">
          <p className="text-sm font-semibold text-slate-900">
            Welcome to Coreframe Dashboard.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Fill in your business details to get started.
          </p>
        </div>
      )}

      <SettingsForm
        business={business}
        onboarding={onboarding}
        onSaved={(saved) => {
          setBusiness(saved);
          setToast("Saved");
        }}
      />

      <GoalsForm
        businessId={business?.id ?? null}
        currency={business?.currency ?? "GBP"}
        goals={goals}
        onSaved={(saved) => {
          setGoals(saved);
          setToast("Goals saved");
        }}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
