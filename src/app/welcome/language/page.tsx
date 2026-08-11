"use client";

import { Logo } from "@/components/ui/Logo";
import { LanguageCards } from "@/components/i18n/LanguageCards";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Mandatory first-launch screen (see proxy.ts — any browser without a
// NEXT_LOCALE cookie is redirected here before /login or anything else).
// Picking a language persists it and moves on to the splash screen.
//
// The entrance was a Framer Motion motion.div (opacity:0 -> 1 on mount)
// until this was found, in real testing, stuck at its initial (invisible)
// state — and since this is literally the very first screen a brand-new
// user ever sees, that's as bad as this bug pattern gets (see
// AuthShell.tsx's doc comment for the full explanation). Plain CSS
// keyframe now — no JS mount-timing dependency, so no code path leaves
// this screen blank.
export default function LanguageSelectPage() {
  const { dict } = useLocale();

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8 flex justify-center">
        <Logo showWordmark={false} className="scale-150" />
      </div>
      <h1 className="text-balance text-center font-display text-2xl font-semibold text-white">{dict.welcome.languageTitle}</h1>
      <p className="mt-2 text-center text-sm text-navy-200">{dict.welcome.languageSubtitle}</p>
      <div className="mt-8">
        <LanguageCards redirectTo="/welcome/splash" />
      </div>
    </div>
  );
}
