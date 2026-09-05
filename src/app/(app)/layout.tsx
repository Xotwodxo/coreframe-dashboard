import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/dal";

/**
 * Everything inside the (app) route group is Charlie's. proxy.ts already made
 * an optimistic check on the cookie; this is the one that actually verifies
 * the token with Supabase, per Next's guidance that proxy is not an
 * authorisation boundary. RLS is the third and final gate.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return <AppShell>{children}</AppShell>;
}
