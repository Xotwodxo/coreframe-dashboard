import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Coreframe Admin",
  robots: { index: false, follow: false },
};

/**
 * Styled like the website's hero: navy ground, a soft cyan glow, the light
 * wordmark, and one white card. Nothing else, because there is nothing else
 * to do here.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const raw = params.next;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  // Open-redirect guard: only same-site paths are ever honoured.
  const next =
    candidate && candidate.startsWith("/") && !candidate.startsWith("//")
      ? candidate
      : "/";

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-navy px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-cyan/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-cyan/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <Image
          src="/logo-light.png"
          alt="Coreframe Digital"
          width={1476}
          height={279}
          priority
          className="mx-auto mb-8 h-9 w-auto"
        />

        <div className="rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Admin sign in</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Private system. Enquiries from coreframedigital.co.uk.
          </p>

          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
