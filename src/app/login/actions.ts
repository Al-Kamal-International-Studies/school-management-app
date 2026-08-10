"use server";

import { createAuthClient } from "@/lib/supabase/authClient";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/security/rateLimit";
import { setAccountBanned } from "@/lib/auth/accountAccess";
import { logAuditEvent } from "@/lib/audit/log";
import { completeLogin } from "@/lib/auth/completeLogin";

export interface LoginState {
  error?: string;
}

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 15 * 60;

/** Account auto-deactivates after this many *consecutive* failed attempts —
 * a real, permanent-until-an-admin-fixes-it lockout, separate from and in
 * addition to the rate limiter above (which just slows down guessing for
 * 15 minutes and resets itself; this one actually disables the account). */
const MAX_FAILED_ATTEMPTS = 3;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  // Keyed by the submitted email, not IP — this app has no edge/proxy to
  // read a trustworthy client IP from yet (see docs/SECURITY.md §4, Phase
  // 3). Only *failed* attempts are recorded below, so a legitimate user
  // never gets close to this limit no matter how often they sign in.
  const bucket = `login:${email.toLowerCase()}`;
  const { limited } = await checkRateLimit(bucket, { maxAttempts: LOGIN_MAX_ATTEMPTS, windowSeconds: LOGIN_WINDOW_SECONDS });
  if (limited) {
    return { error: "Too many failed attempts. Wait a few minutes and try again." };
  }

  // createAuthClient (not the plain createClient) so "Remember me" can
  // control whether the resulting session cookies persist across browser
  // restarts or clear when it closes — see its doc comment.
  const supabase = await createAuthClient(remember);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordRateLimitAttempt(bucket);

    // No session exists at this point (the sign-in attempt itself failed),
    // so the failed_login_attempts counter has to be read/written through
    // the service-role client, looked up by email. This only ever touches
    // an *existing* account's own counter — an attempt against an email
    // with no account matches nothing here and just falls through to the
    // generic "incorrect" response below, same as always.
    const admin = createAdminClient();
    const { data: target } = await admin
      .from("profiles")
      .select("id, failed_login_attempts, is_active")
      .eq("email", email)
      .is("archived_at", null)
      .maybeSingle();

    if (target && target.is_active) {
      const attempts = target.failed_login_attempts + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await admin.from("profiles").update({ failed_login_attempts: attempts, is_active: false }).eq("id", target.id);
        await setAccountBanned(target.id, true);
        await logAuditEvent(target.id, "auto_deactivate_failed_logins", "profiles", target.id, { attempts });
        return { error: "This account has been deactivated after 3 failed attempts. Contact your administrator." };
      }
      await admin.from("profiles").update({ failed_login_attempts: attempts }).eq("id", target.id);
    }

    return { error: "Incorrect email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active, failed_login_attempts")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "No profile found for this account. Contact your administrator." };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This account has been deactivated. Contact your administrator." };
  }

  return completeLogin(profile, next);
}
