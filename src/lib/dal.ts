import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer.
 *
 * proxy.ts does an *optimistic* check so logged-out visitors get bounced
 * cheaply, but Next's own guidance is explicit that proxy is not an
 * authorisation solution - it runs on prefetches and only sees the cookie.
 * So every server component and server action that touches Charlie's data calls
 * requireUser() first, and the database enforces it a third time through RLS.
 *
 * cache() means the verification runs once per request no matter how many
 * components ask for it.
 */
export const requireUser = cache(async (): Promise<User> => {
  const supabase = await createClient();

  // getUser() revalidates the token with Supabase. getSession() reads it from
  // the cookie without verifying, which is not good enough to authorise on.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return user;
});

/** Same check, but for callers that want to branch rather than redirect. */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
