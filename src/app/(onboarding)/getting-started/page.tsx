import type { Metadata } from "next";
import { requireDashboardAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { floorForVisit } from "@/lib/onboarding/version";
import { safeReturnPath } from "@/lib/onboarding/storage";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.nav.gettingStarted };
}

export default async function GettingStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // Cached per request: the layout has already run every gate.
  const profile = await requireDashboardAccess();

  // Same lookup the dashboard layout does: only the chat-oversight account
  // gets the Chat oversight lesson.
  let canOverseeChats = false;
  if (profile.role === "admin") {
    const supabase = await createClient();
    const { data } = await supabase.rpc("is_chat_overseer", { p_user: profile.id });
    canOverseeChats = data === true;
  }

  // The page the person was opening when the flow auto-started (or the page
  // the banner was on). Only same-site paths; anything else means "dashboard".
  const { next } = await searchParams;
  const returnTo = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <OnboardingFlow
      userId={profile.id}
      role={profile.role}
      canOverseeChats={canOverseeChats}
      sinceFloor={floorForVisit(profile)}
      returnTo={returnTo}
    />
  );
}
