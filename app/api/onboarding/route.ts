import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";

const CURRENCIES = ["GBP", "EUR", "USD", "CAD", "AUD"];
const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

// Creates the businesses row for a newly signed-in user
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    business_name?: string;
    business_type?: string;
    currency?: string;
    brand_colour?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const businessName = body.business_name?.trim();
  const businessType = body.business_type?.trim();

  if (!businessName) {
    return NextResponse.json(
      { error: "Business name is required" },
      { status: 400 }
    );
  }
  if (!businessType) {
    return NextResponse.json(
      { error: "Business type is required" },
      { status: 400 }
    );
  }

  const currency = CURRENCIES.includes(body.currency ?? "")
    ? body.currency!
    : "GBP";
  const brandColour = HEX_COLOUR.test(body.brand_colour ?? "")
    ? body.brand_colour!
    : "#00C4CC";

  const admin = createAdminClient();
  const { data: businessRow, error } = await admin
    .from("businesses")
    .upsert(
      {
        user_id: user.id,
        business_name: businessName,
        business_type: businessType,
        currency,
        brand_colour: brandColour,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ business: businessRow });
}
