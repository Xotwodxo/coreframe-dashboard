"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(callbackError);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (otpError) {
      setError(otpError.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
      <Link
        href="/"
        className="text-base font-semibold tracking-tight text-navy"
      >
        Coreframe <span className="text-brand">Dashboard</span>
      </Link>

      {status === "sent" ? (
        <div className="mt-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
              <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            We sent a sign-in link to{" "}
            <span className="font-medium text-slate-900">{email}</span>.
          </p>
        </div>
      ) : (
        <>
          <h1 className="mt-6 text-xl font-semibold text-slate-900">
            Sign in to your dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your email and we will send you a sign-in link. No password
            needed.
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@yourbusiness.co.uk"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-navy transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "loading" ? "Sending..." : "Send sign-in link"}
            </button>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </form>
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
