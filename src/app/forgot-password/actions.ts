"use server";

import { createClient } from "@/lib/supabase/server";

export interface ForgotPasswordState {
  error?: string;
  success?: boolean;
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter your email address." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Always report success even if the email isn't registered, so the form
  // can't be used to enumerate valid accounts.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  return { success: true };
}
