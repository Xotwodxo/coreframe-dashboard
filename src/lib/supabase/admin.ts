import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. BYPASSES RLS.
 *
 * Server-side only, and only for work that has no logged-in user to act as -
 * currently just the public website posting an enquiry to /api/enquiries.
 * Never import this into a client component, and never use it to serve a
 * request on Charlie's behalf: that is what the RLS-respecting server client in
 * ./server.ts is for.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
