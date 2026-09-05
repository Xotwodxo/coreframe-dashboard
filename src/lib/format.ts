const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export function formatDate(value: string | null): string {
  if (!value) return "Not set";
  return DATE.format(new Date(value));
}

/** "Fri 5 Sep, 14:32", for the one place the exact time matters. */
export function formatDateTime(value: string): string {
  return DATE_TIME.format(new Date(value));
}

/**
 * "2 hours ago", for lists where the exact timestamp is noise. Hour
 * granularity for the first day because the 24-hour reply window is the
 * behaviour this app exists to change.
 */
export function formatRelative(value: string, now = Date.now()): string {
  const diff = now - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  return DATE.format(new Date(value));
}

/** Strips spaces so a tel: link works however the visitor typed the number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[\s()-]/g, "")}`;
}

/**
 * Money is stored, passed around and totalled as integer pence. It becomes a
 * string only at the point it is shown.
 */
const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPence(pence: number): string {
  return GBP.format(pence / 100);
}

/** "1 hr 15 min", "45 min", "2 hrs". Time is integer minutes everywhere. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  const h = hours === 1 ? "1 hr" : `${hours} hrs`;
  return rest === 0 ? h : `${h} ${rest} min`;
}

/** Whole days from today to a date, negative when it has passed. */
export function daysUntil(date: string, now = Date.now()): number {
  const target = new Date(`${date}T00:00:00Z`).getTime();
  const today = new Date(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  return Math.round((target - today) / 86_400_000);
}
