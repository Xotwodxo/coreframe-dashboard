import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Enquiry intake, called server-to-server by coreframedigital.co.uk.
 *
 * WHY THIS EXISTS: the website used to post its forms to Formspree and store
 * nothing. If a send failed the lead was gone permanently and nobody knew.
 * Every enquiry becomes a record here first, and the email stays as the
 * notification rather than the system of record.
 *
 * The website has already validated and rate-limited the submission before
 * it gets here, so this route re-checks the shape but not the option values:
 * if a service is added to the form dropdown the enquiry is stored, not
 * rejected.
 *
 * Auth is a shared secret, not a session - there is no user on this path.
 * proxy.ts deliberately excludes this route from its matcher for that reason.
 * This is the ONLY file in the app that imports the service role client.
 */

export const runtime = "nodejs";

const LIMITS = {
  name: 100,
  phone: 40,
  email: 254,
  message: 3000,
  page: 120,
  serviceInterest: 120,
  businessName: 120,
  budget: 60,
  timing: 60,
} as const;

type Field = keyof typeof LIMITS;

/**
 * Trimmed string within the field's limit, "" for absent or blank, or null
 * when the value is the wrong type or too long. Absent and blank mean the
 * same thing, so a caller omitting an optional field is not rejected.
 */
function text(value: unknown, field: Field): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length <= LIMITS[field] ? cleaned : null;
}

/** Constant-time comparison so the secret cannot be probed by timing. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_INTAKE_SECRET;
  if (!expected) {
    console.error("[enquiries] ADMIN_INTAKE_SECRET is not set. Refusing.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // Same rule for the database key: refuse loudly rather than crash at insert.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[enquiries] SUPABASE_SERVICE_ROLE_KEY is not set. Refusing.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  if (!secretMatches(request.headers.get("x-cf-intake-key"), expected)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fields = {} as Record<Field, string>;
  for (const field of Object.keys(LIMITS) as Field[]) {
    const value = text(body[field], field);
    if (value === null) {
      return NextResponse.json(
        { error: `Field "${field}" is not a string or is too long.` },
        { status: 400 }
      );
    }
    fields[field] = value;
  }

  // Name is the only field both website forms require. Everything else is
  // optional so that the two forms, and any future one, share this route.
  if (!fields.name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  // Service role: there is no signed-in user on this path, so RLS has nobody
  // to authorise. The shared secret above is what guards it.
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      source: "coreframe",
      name: fields.name,
      phone: fields.phone || null,
      email: fields.email || null,
      message: fields.message || null,
      page: fields.page || null,
      service_interest: fields.serviceInterest || null,
      business_name: fields.businessName || null,
      budget: fields.budget || null,
      timing: fields.timing || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[enquiries] Insert failed.", error.message);
    return NextResponse.json({ error: "Could not store enquiry." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
