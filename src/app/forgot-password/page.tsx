import { AuthShell } from "@/components/auth/AuthShell";
import { getLoginCenterId } from "@/lib/centers/loginCenterCookie";
import { knownCenterFor } from "@/lib/centers/knownCenters";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

// Server Component wrapper (was previously the client component itself)
// specifically so this can read the pre-login center cookie the same way
// /login does — see AuthShell's own comment on why this page shows that
// center's branding too (no picker here, just consistency: a visitor who
// picked AKET on /login and clicks "Forgot password?" shouldn't land on a
// screen that's silently switched back to AKIS branding).
export default async function ForgotPasswordPage() {
  const center = knownCenterFor(await getLoginCenterId());

  return (
    <AuthShell center={center}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
