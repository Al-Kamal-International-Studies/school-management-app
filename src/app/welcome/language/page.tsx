"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { LanguageCards } from "@/components/i18n/LanguageCards";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Mandatory first-launch screen (see proxy.ts — any browser without a
// NEXT_LOCALE cookie is redirected here before /login or anything else).
// Picking a language persists it and moves on to the splash screen.
export default function LanguageSelectPage() {
  const { dict } = useLocale();

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
      <div className="mb-8 flex justify-center">
        <Logo showWordmark={false} className="scale-150" />
      </div>
      <h1 className="text-balance text-center font-display text-2xl font-semibold text-white">{dict.welcome.languageTitle}</h1>
      <p className="mt-2 text-center text-sm text-navy-200">{dict.welcome.languageSubtitle}</p>
      <div className="mt-8">
        <LanguageCards redirectTo="/welcome/splash" />
      </div>
    </motion.div>
  );
}
