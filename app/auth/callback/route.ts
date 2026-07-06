import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  let authError = true;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = !!error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    authError = !!error;
  }

  if (authError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "Could not sign you in. The link may have expired, please request a new one."
      )}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "Could not sign you in. Please request a new link."
      )}`
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.redirect(
    business
      ? `${origin}/dashboard`
      : `${origin}/dashboard/settings?onboarding=true`
  );
}
