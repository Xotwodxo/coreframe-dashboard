import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { SignOutButton } from "@/components/layout/SignOutButton";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="leading-none">
            <span className="text-base font-semibold tracking-tight text-navy">
              Coreframe
            </span>
            <span className="ml-2 text-xs text-muted-foreground">Admin</span>
          </div>
          <SignOutButton />
        </div>
        {/* The brand rule from the document template: navy into cyan. The
            only place the bright cyan appears, and it is not text. */}
        <div
          aria-hidden
          className="h-0.5 w-full"
          style={{ background: "linear-gradient(to right, var(--navy), var(--cyan))" }}
        />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
