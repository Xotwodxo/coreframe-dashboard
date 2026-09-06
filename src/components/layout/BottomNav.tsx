"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Home, Inbox, Send, Users } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Primary navigation, thumb-height at the bottom of the screen. Five items,
 * the same count as the Floor Fitter Wales shell: Today, the enquiries that
 * feed the business, the clients that pay for it, the kit that answers an
 * enquiry, and the list of everything else. That is the lot.
 */
const LINKS = [
  { href: "/", label: "Today", icon: Home },
  { href: "/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/kit", label: "Kit", icon: Send },
  { href: "/todo", label: "To do", icon: CheckSquare },
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
