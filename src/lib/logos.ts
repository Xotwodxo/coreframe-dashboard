/**
 * Client logos live in the public `client-logos` Storage bucket, one folder
 * per client. The file name carries a timestamp so a replaced logo gets a new
 * URL and no browser keeps showing the old one.
 */
export const LOGO_BUCKET = "client-logos";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function logoUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${LOGO_BUCKET}/${path}`;
}

/** "Evans Fencing & Landscapes Ltd" becomes "EF". */
export function initials(name: string): string {
  const words = name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter((word) => word && !/^(ltd|limited|and|the|of)$/i.test(word));
  const letters = words.slice(0, 2).map((word) => word[0]!.toUpperCase());
  return letters.join("") || name.slice(0, 2).toUpperCase();
}
