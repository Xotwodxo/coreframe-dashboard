"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Primary navigation, thumb-height at the bottom of the screen. Two items,
 * because phase 1 has two screens. Phase 2 adds Clients here and nowhere else.
 */
const LINKS = [
  { href: "/", label: "Today", icon: Home },
  { href: "/enquiries", label: "Enquiries", icon: Inbox },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      // Keeps the bar clear of the iPhone home indicator.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-3xl">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-cyan-action"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
