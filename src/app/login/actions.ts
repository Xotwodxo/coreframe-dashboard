"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
}

/**
 * Single-administrator login. There is deliberately no sign-up route: Charlie's
 * account is created once in Supabase and that is the only one.
 */
export async function signIn(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) {
    return { error: "Enter your email address and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: never confirm whether an address has an account.
    return { error: "That email address and password did not match." };
  }

  revalidatePath("/", "layout");
  // Only ever redirect within this app, never to a URL a caller supplied.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
