import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`. The rename is silent - a
 * file still called middleware.ts simply never runs - so this file's name is
 * load-bearing. `next build` prints "Proxy (Middleware)" when it is wired.
 *
 * Two jobs, and deliberately only two:
 *  1. Refresh the Supabase session cookie, because Server Components cannot
 *     write cookies and would otherwise let the session quietly expire.
 *  2. An optimistic redirect for logged-out visitors.
 *
 * This is NOT the authorisation boundary. That is lib/dal.ts plus RLS.
 */

/** Routes reachable without a session. Everything else is Charlie's. */
const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Send him back where he was heading once he is in.
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in and looking at the login page: go to Today.
  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  /*
   * Everything except Next internals, the enquiry intake route (called by the
   * public website with a shared secret, not a session) and static files.
   */
  matcher: [
    "/((?!_next/static|_next/image|api/enquiries|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
