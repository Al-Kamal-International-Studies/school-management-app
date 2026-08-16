import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";

// Routes that don't require an authenticated session. /reset-password no
// longer exists — password resets are admin-mediated now (see
// src/app/forgot-password/actions.ts) — removed from here deliberately.
const PUBLIC_PATHS = ["/login", "/forgot-password", "/welcome"];

// Static infrastructure files a browser (not a signed-in user) fetches on
// its own, outside any page navigation: the PWA install manifest and the
// service worker script itself (see public/sw.js, registered by
// PwaRegister.tsx). These were previously NOT exempt from either gate
// below — a browser's own SW-registration/update-check request for
// `/sw.js`, or its manifest fetch for installability, could get answered
// with a 307 redirect (to /welcome/language pre-locale-cookie, or to
// /login pre-auth) instead of the actual file. A redirected response for
// a service-worker script is invalid per spec — `register()`/the browser's
// periodic update check silently fails, so the OLD already-installed SW
// keeps running instead of ever picking up... itself. (This app's sw.js
// only ever caches content-hashed static assets — see public/sw.js's own
// header comment — so this couldn't explain stale HTML/JS/CSS on its own,
// since navigations always bypass the SW cache; but a service worker that
// can't reliably reach its own script is still a real correctness gap
// worth closing, found while investigating a "still cut off after the fix"
// report — see HANDOVER.md for the write-up.) Exact-path entries, matching
// the two real static files this app actually serves at these routes.
const PUBLIC_STATIC_FILES = ["/sw.js", "/manifest.json"];

function isPublicPath(pathname: string) {
  if (PUBLIC_STATIC_FILES.includes(pathname)) return true;
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refresh the auth session (and its cookies) on every request — required
  // for Server Components to see a valid session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  // Mandatory first-launch language screen: if this browser has never picked
  // a language, send it there before anything else (including /login) — the
  // cookie persists, so this only ever fires once per browser. Also skipped
  // for the static infrastructure files above — a first-ever visit's SW
  // registration or manifest fetch races the human's own first navigation
  // and must never be answered with an HTML redirect either.
  if (!request.cookies.get(LOCALE_COOKIE) && !pathname.startsWith("/welcome") && !PUBLIC_STATIC_FILES.includes(pathname)) {
    return NextResponse.redirect(new URL("/welcome/language", request.url));
  }

  if (!user && !publicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    // Role-based redirect happens on "/" itself (needs a DB read); just get
    // logged-in users off the login page.
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
