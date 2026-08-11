"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const SPLASH_DURATION_MS = 1400;

// Short branded welcome animation shown once, right after language
// selection, then navigates straight to /login — kept brief on purpose
// ("short and not delay access unnecessarily").
//
// The logo/tagline/progress-track entrances used to be Framer Motion
// motion.divs fading in from opacity:0 on mount, same as the rest of this
// pass's fix — found stuck at their initial (invisible) state in real
// testing, which on this specific screen meant a brand-new user's first
// 1.4 seconds in the app could be a blank navy rectangle. Switched to the
// plain CSS `animate-fade-in`/`animate-fade-in-up` keyframes (no JS
// mount-timing dependency) for anything that gates visibility of the logo
// or text. The progress *fill* bar underneath is left on Framer Motion —
// it's a decorative width tween representing elapsed time, not something
// that leaves text or the crest invisible if a frame is ever dropped, and
// the `setTimeout` navigation below doesn't depend on it finishing either.
export default function SplashPage() {
  const router = useRouter();
  const { dict } = useLocale();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/login"), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="animate-fade-in-up">
        <Logo showWordmark={false} className="scale-[2]" />
      </div>
      <span
        className="animate-fade-in-up rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300"
        style={{ animationDelay: "250ms" }}
      >
        {dict.welcome.splashTagline}
      </span>
      <div className="mt-2 h-1 w-40 animate-fade-in overflow-hidden rounded-full bg-white/10" style={{ animationDelay: "400ms" }}>
        <motion.div
          className="h-full rounded-full bg-gold-gradient"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: SPLASH_DURATION_MS / 1000, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
