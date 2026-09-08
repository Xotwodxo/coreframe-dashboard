import { PiggyBank } from "lucide-react";

/**
 * The finance app is a separate, local-only tool: a SQLite ledger served from
 * the Mac on port 3060, never deployed. This link puts it one tap away from
 * the admin without pulling the money into the cloud. It only resolves on the
 * machine running it, so the title says so rather than hiding it on phones.
 */
const FINANCE_URL = process.env.NEXT_PUBLIC_FINANCE_URL ?? "http://localhost:3060";

export function FinanceLink() {
  return (
    <a
      href={FINANCE_URL}
      target="_blank"
      rel="noreferrer"
      title="Opens the local finance app. It runs on the Mac, so the link only works there."
      className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      <PiggyBank className="size-4" aria-hidden />
      Finance
      <span className="sr-only">(opens the local finance app in a new tab)</span>
    </a>
  );
}
