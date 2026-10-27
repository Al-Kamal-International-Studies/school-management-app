import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasAkisAccess } from "@/lib/centers/hasAkisAccess";
import { WEBAUTHN_LOGIN_VERIFIED_COOKIE } from "@/lib/webauthn/config";

/**
 * Where (dashboard)/layout.tsx sends a signed-in profile that has no AKIS
 * access grant — i.e. a session that predates the AKET removal (HANDOVER
 * Part 37). A layout can't clear auth cookies itself, so this route handler
 * does the sign-out. It only signs out when the profile really lacks AKIS
 * access, so a stray link to this URL can never log a legitimate user out;
 * anyone else is just sent home.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !(await hasAkisAccess(user.id))) {
    await supabase.auth.signOut();
    (await cookies()).delete(WEBAUTHN_LOGIN_VERIFIED_COOKIE);
    return NextResponse.redirect(new URL("/login?error=no_access", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
