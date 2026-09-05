import { createClient } from "../../../../lib/supabase/server";
import { isLocalDashboardMode } from "../../../../lib/local-mode";
import { runSeoAudit } from "../../../../lib/seo/crawler";
import type { SeoAuditRequest } from "../../../../lib/seo/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isLocalDashboardMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Sign in to run an SEO audit." }, { status: 401 });
    }
  }

  let body: SeoAuditRequest;
  try {
    body = (await request.json()) as SeoAuditRequest;
  } catch {
    return Response.json({ error: "The audit request was not valid." }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return Response.json({ error: "Enter the website address to audit." }, { status: 400 });
  }

  try {
    const audit = await runSeoAudit({
      url: body.url,
      siteName: body.siteName,
      maxPages: body.maxPages,
    });
    return Response.json({ audit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The audit could not be completed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
