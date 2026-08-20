"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { WEBAUTHN_LOGIN_VERIFIED_COOKIE } from "@/lib/webauthn/config";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Defense in depth alongside loginAction's own clear — a passkey-verified
  // marker has no meaning once this session is gone.
  (await cookies()).delete(WEBAUTHN_LOGIN_VERIFIED_COOKIE);
  redirect("/login");
}
