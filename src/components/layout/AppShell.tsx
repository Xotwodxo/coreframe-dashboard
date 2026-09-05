import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { SignOutButton } from "@/components/layout/SignOutButton";

/**
 * The header is the website's navbar: navy, the light wordmark, nothing else.
 * The rule beneath it is the document template's navy-to-cyan gradient, and
 * the only place the bright brand cyan appears at full strength.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-navy text-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3" aria-label="Today">
            <Image
              src="/logo-light.png"
              alt="Coreframe Digital"
              width={1476}
              height={279}
              priority
              className="h-7 w-auto"
            />
            <span className="mt-0.5 border-l border-white/20 pl-3 text-xs font-medium tracking-wide text-white/60 uppercase">
              Admin
            </span>
          </Link>
          <SignOutButton />
        </div>
        <div
          aria-hidden
          className="h-0.5 w-full"
          style={{ background: "linear-gradient(to right, var(--navy), var(--cyan))" }}
        />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
