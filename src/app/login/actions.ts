"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/security/rateLimit";

export interface LoginState {
  error?: string;
}

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 15 * 60;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordRateLimitAttempt(bucket);
    return { error: "Incorrect email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
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

  redirect(next || dashboardPathForRole(profile.role));
}
