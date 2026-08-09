"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
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
