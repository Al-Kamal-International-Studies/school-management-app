import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RegisterBiometricButton } from "./RegisterBiometricButton";

export async function BiometricSettingsCard() {
  const me = await getCurrentProfile();
  if (!me) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("webauthn_credentials")
    .select("*")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false });

  return <RegisterBiometricButton credentials={data ?? []} />;
}
