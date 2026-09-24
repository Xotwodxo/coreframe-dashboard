/**
 * Where a lead came from. Mirrors the Lead Sources list in the business
 * tracker, so the two can be compared side by side. Website enquiries get
 * "Website enquiry" from the database default; the rest are logged by hand.
 */
export const LEAD_SOURCES = [
  "Website enquiry",
  "Google Business Profile",
  "Facebook group",
  "Bark",
  "Reddit",
  "Referral",
  "Phone call",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export function isLeadSource(value: unknown): value is LeadSource {
  return typeof value === "string" && (LEAD_SOURCES as readonly string[]).includes(value);
}

/** "45m", "3h 10m", "2d 4h". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}
