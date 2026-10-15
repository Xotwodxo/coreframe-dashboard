import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily keep-alive, called by Vercel Cron (see vercel.json).
 *
 * WHY THIS EXISTS: Supabase pauses a free project after seven days without
 * API traffic. On 15 Oct 2026 this project was found paused, so every website
 * enquiry since had failed to be recorded and the reply-time number was off.
 * One lightweight read a day keeps the project awake whether or not anyone
 * opens the admin that week.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` on every cron call, so
 * the route refuses anything else. No data is returned.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[keepalive] CRON_SECRET is not set. Refusing.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("settings").select("key").limit(1);
  if (error) {
    console.error("[keepalive] Read failed.", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
