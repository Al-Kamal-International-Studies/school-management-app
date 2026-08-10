"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/security/rateLimit";
import { sendPushToUsers } from "@/lib/push/send";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export interface ForgotPasswordState {
  error?: string;
  success?: boolean;
}

const RESET_MAX_ATTEMPTS = 5;
const RESET_WINDOW_SECONDS = 60 * 60;

/**
 * Replaces the old "email a reset link" flow entirely (see migration
 * 0023_password_reset_requests.sql's banner comment) — this just queues a
 * request for an admin to handle manually via
 * /admin/password-reset-requests, which sets a new password directly.
 *
 * Uses the service-role client throughout: the submitter has no session at
 * this point (that's the entire premise of "forgot password"), and
 * password_reset_requests has zero RLS policies for anon/authenticated by
 * design — only this action can ever write to it.
 *
 * Preserves the app's existing anti-enumeration property: the response is
 * identical (generic success) whether the email matches a real account,
 * is unknown, or the request was rate-limited — nothing about the reply
 * ever reveals which case occurred. A request row is only actually inserted
 * for a real, non-archived account, so admins aren't spammed by junk
 * submitted against made-up addresses.
 */
export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter your email address." };
  }

  const bucket = `forgot_password:${email.toLowerCase()}`;
  const { limited } = await checkRateLimit(bucket, { maxAttempts: RESET_MAX_ATTEMPTS, windowSeconds: RESET_WINDOW_SECONDS });

  if (!limited) {
    await recordRateLimitAttempt(bucket);
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .is("archived_at", null)
      .maybeSingle();

    if (profile) {
      await admin.from("password_reset_requests").insert({ email });

      // Best-effort: notify any admin with push enabled. Never blocks the
      // response — a notification failure shouldn't make this action look
      // like it failed to the (unauthenticated) submitter.
      const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin").is("archived_at", null);
      if (admins && admins.length > 0) {
        const dict = await getDictionary(await getLocale());
        await sendPushToUsers(
          admins.map((a) => a.id),
          { title: dict.adminPasswordResetRequests.pushTitle, body: `${dict.adminPasswordResetRequests.pushBodyPrefix} ${email}`, url: "/admin/password-reset-requests" }
        );
      }
    }
  }

  return { success: true };
}
