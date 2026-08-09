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
export default function SplashPage() {
  const router = useRouter();
  const { dict } = useLocale();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/login"), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Logo showWordmark={false} className="scale-[2]" />
      </motion.div>
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300"
      >
        {dict.welcome.splashTagline}
      </motion.span>
      <motion.div
        className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className="h-full rounded-full bg-gold-gradient"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: SPLASH_DURATION_MS / 1000, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
