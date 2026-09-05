import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · Coreframe Admin",
  robots: { index: false, follow: false },
};

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
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-sm font-medium tracking-wide text-cyan-action uppercase">
            Coreframe Digital
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Admin sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Private system. Enquiries from coreframedigital.co.uk.
          </p>
        </div>

        <LoginForm next={next} />
      </div>
    </main>
  );
}
