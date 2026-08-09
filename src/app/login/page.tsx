import { redirect } from "next/navigation";
import { getCurrentProfile, dashboardPathForRole } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(dashboardPathForRole(profile.role));
  }

  const { next, error } = await searchParams;
  const dict = await getDictionary(await getLocale());

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.login.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-300">{dict.login.subtitle}</p>
      </div>
      <LoginForm next={next} deactivated={error === "account_deactivated"} dict={dict} />
      <p className="mt-8 text-center text-xs text-slate-400 dark:text-navy-400">{dict.login.footer}</p>
    </AuthShell>
  );
}
