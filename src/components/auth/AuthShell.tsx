"use client";

import { motion } from "framer-motion";
import { GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { WalkingRobots } from "./WalkingRobots";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  const { dict } = useLocale();
  const FEATURES = [
    { icon: GraduationCap, text: dict.authBranding.feature1 },
    { icon: ShieldCheck, text: dict.authBranding.feature2 },
    { icon: Sparkles, text: dict.authBranding.feature3 },
  ];

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-50 dark:bg-navy-950">
      {/* Branding panel */}
      <div className="relative hidden w-[45%] max-w-xl flex-col justify-between overflow-hidden bg-navy-gradient p-12 text-white lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <motion.div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-navy-400/20 blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Logo />
        </motion.div>

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <span className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300">
            {dict.authBranding.tagline}
          </span>
          <p className="font-display text-3xl font-semibold leading-snug text-balance">{dict.authBranding.headline}</p>
          <div className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                className="flex items-center gap-3 text-sm text-navy-100"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-gold-300" strokeWidth={1.75} />
                </span>
                {text}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          className="relative z-10 text-xs text-navy-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          © {new Date().getFullYear()} Al Kamal International Studies
        </motion.p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 lg:hidden">
          <Logo onLight />
        </div>
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </div>

      <WalkingRobots />
    </div>
  );
}
