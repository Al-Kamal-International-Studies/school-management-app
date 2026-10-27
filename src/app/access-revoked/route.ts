import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasAkisAccess } from "@/lib/centers/hasAkisAccess";
import { WEBAUTHN_LOGIN_VERIFIED_COOKIE } from "@/lib/webauthn/config";
import { MAX_FAILED_ATTEMPTS } from "@/lib/auth/lockout";

/**
 * Where pages send a signed-in profile that must not stay signed in: no AKIS
 * access grant (a session that predates the AKET removal, HANDOVER Part 37),
 * or a deactivated/locked account (HANDOVER Part 40 — a session that was live
 * when the account was locked). A layout can't clear auth cookies itself, so
 * this route handler does the sign-out. It only signs out when one of those
 * is really true, so a stray link to this URL can never log a legitimate user
 * out; anyone else is just sent home.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("is_active, failed_login_attempts").eq("id", user.id).maybeSingle();
    const error = !profile?.is_active
      ? profile && profile.failed_login_attempts >= MAX_FAILED_ATTEMPTS
        ? "account_locked"
        : "account_deactivated"
      : !(await hasAkisAccess(user.id))
        ? "no_access"
        : null;
    if (error) {
      await supabase.auth.signOut();
      (await cookies()).delete(WEBAUTHN_LOGIN_VERIFIED_COOKIE);
      return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
    }
  }

  return NextResponse.redirect(new URL("/", request.url));
}
