const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  CAD: "$",
  AUD: "$",
};

export function currencySymbol(currency: string = "GBP"): string {
  return CURRENCY_SYMBOLS[currency] ?? "£";
}

export function formatCurrency(value: number, currency: string = "GBP"): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString("en-GB");
  return `${rounded < 0 ? "-" : ""}${currencySymbol(currency)}${abs}`;
}

export function formatPercent(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
}

function parseDate(dateStr: string): Date {
  // Treat date-only strings as local dates to avoid timezone drift
  return new Date(
    dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr
  );
}

export function formatDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthShort(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex];
}
