"use client";

import { motion } from "framer-motion";
import { GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { WalkingRobots } from "./WalkingRobots";
import { AuthBackground } from "./AuthBackground";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  const { dict } = useLocale();
  const { theme } = useTheme();
  const FEATURES = [
    { icon: GraduationCap, text: dict.authBranding.feature1 },
    { icon: ShieldCheck, text: dict.authBranding.feature2 },
    { icon: Sparkles, text: dict.authBranding.feature3 },
  ];

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-50 dark:bg-navy-950">
      {/* Ambient background for the whole shell — sits behind both panels;
          the branding panel's own opaque gradient covers it there, so in
          practice this is what makes the form panel (and the entire page
          on mobile, where the branding panel is hidden) feel designed
          instead of blank. See AuthBackground.tsx for the layering note. */}
      <AuthBackground />

      {/* Branding panel */}
      <div className="relative hidden w-[45%] max-w-xl flex-col justify-between overflow-hidden bg-navy-gradient p-12 text-white lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        {/* These two are genuinely continuous (repeat: Infinity) and purely
            decorative — Framer Motion is the right tool here, and if a
            frame ever gets skipped the worst case is a static glow, not
            missing content. Kept on Framer Motion deliberately; everything
            below that gates real text was moved off it — see the note by
            the form-panel wrapper for why. */}
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

        <div className="animate-fade-in-up">
          <Logo />
        </div>

        <div className="relative z-10 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <span className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300">
            {dict.authBranding.tagline}
          </span>
          <p className="font-display text-3xl font-semibold leading-snug text-balance">{dict.authBranding.headline}</p>
          <div className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <div
                key={text}
                className="flex animate-fade-in-up items-center gap-3 text-sm text-navy-100"
                style={{ animationDelay: `${240 + i * 80}ms` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-gold-300" strokeWidth={1.75} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 animate-fade-in text-xs text-navy-200" style={{ animationDelay: "480ms" }}>
          © {new Date().getFullYear()} Al Kamal International Studies
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile-only logo (branding panel above is `lg:hidden` away). This
            panel's actual background flips with the active theme — it's
            `bg-slate-50` in light mode but `bg-navy-950` (dark navy) in dark
            mode, inherited from the outer AuthShell wrapper. `onLight` picks
            the crest/wordmark's own color, so it must track the *resolved*
            theme rather than being hardcoded: a hardcoded `onLight` rendered
            dark-navy-on-dark-navy in dark mode — invisible. `useTheme()` is
            fed the server-resolved cookie value on first render (see
            RootLayout/ThemeProvider), so this has no hydration flash. */}
        <div className="mb-8 lg:hidden">
          <Logo onLight={theme === "light"} />
        </div>
        {/* This wraps the actual sign-in form — the one thing on this page
            that must never fail to become visible. It used to be a
            motion.div fading in from opacity:0 on mount; that depended on
            Framer Motion's post-hydration effect actually firing to reach
            opacity:1, and it was observed getting stuck at its initial
            (invisible) state in real testing — the JS-driven animation
            never completed, with no fallback, leaving the login form
            unreadable. Plain CSS keyframes (already defined in
            tailwind.config.ts, used elsewhere in the app) don't have that
            failure mode: the animation is attached the instant the browser
            parses this element's style, runs on the compositor thread, and
            — critically — its "not yet started"/"finished" states are both
            just this element's normal (opaque) CSS, so there is no
            JS-dependent path to a permanently-invisible form. Same visual
            effect (fade + slight rise), zero risk of getting stuck. */}
        <div className="w-full max-w-sm animate-fade-in-up">{children}</div>
      </div>

      <WalkingRobots />
    </div>
  );
}
