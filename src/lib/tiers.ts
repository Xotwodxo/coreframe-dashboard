import type { Tier } from "@/lib/types";

/**
 * The care plan tiers, from Business/02-Strategy/packages.md as at 5 Sep 2026.
 *
 * These are defaults applied when a client is created and can be edited per
 * client afterwards. Null allowance means the plan carries no time at all:
 * the friend rate is goodwill-basis minor updates, and Local Visibility is a
 * marketing plan, not a maintenance one.
 */
export interface TierSpec {
  label: string;
  pricePence: number;
  allowanceMinutes: number | null;
  /** Three months' worth of the allowance. */
  capMinutes: number | null;
}

export const TIERS: Record<Tier, TierSpec> = {
  essential: { label: "Essential Care", pricePence: 3500, allowanceMinutes: 15, capMinutes: 45 },
  managed: { label: "Managed Care", pricePence: 6500, allowanceMinutes: 60, capMinutes: 180 },
  growth: { label: "Growth Care", pricePence: 11000, allowanceMinutes: 120, capMinutes: 360 },
  workflow: { label: "Workflow Care", pricePence: 2500, allowanceMinutes: 15, capMinutes: 45 },
  local_visibility: { label: "Local Visibility", pricePence: 19500, allowanceMinutes: null, capMinutes: null },
  friend: { label: "Friend rate", pricePence: 2000, allowanceMinutes: null, capMinutes: null },
};

export const TIER_KEYS = Object.keys(TIERS) as Tier[];

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && value in TIERS;
}
