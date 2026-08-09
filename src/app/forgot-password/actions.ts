"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/security/rateLimit";

export interface ForgotPasswordState {
  error?: string;
  success?: boolean;
}

const RESET_MAX_ATTEMPTS = 5;
const RESET_WINDOW_SECONDS = 60 * 60;

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter your email address." };
  }

  // Rate-limited by silently skipping the actual send once over the limit
  // — not by returning a different response — so the response shape stays
  // identical in every case (unknown email / real email / rate-limited).
  // That preserves the existing enumeration protection exactly: nothing
  // about the reply ever reveals whether an account exists, or now,
  // whether it was just rate-limited either.
  const bucket = `forgot_password:${email.toLowerCase()}`;
  const { limited } = await checkRateLimit(bucket, { maxAttempts: RESET_MAX_ATTEMPTS, windowSeconds: RESET_WINDOW_SECONDS });

  if (!limited) {
    await recordRateLimitAttempt(bucket);
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
  }

  // Always report success even if the email isn't registered (or the
  // request was just rate-limited) — so the form can't be used to
  // enumerate valid accounts.
  return { success: true };
}
