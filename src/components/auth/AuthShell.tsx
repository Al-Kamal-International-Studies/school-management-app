"use client";

import { GraduationCap, ShieldCheck, Landmark } from "lucide-react";
import { CenterLogo } from "./CenterLogo";
import { AuthBackground } from "./AuthBackground";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { AKIS_CENTER } from "@/lib/centers/knownCenters";
import type { ReactNode } from "react";

/**
 * Shell for every sign-in-family screen (login, forgot-password, MFA,
 * passkey setup, device management, forced password change). Always AKIS
 * branding — the only institution this app serves (HANDOVER Part 37).
 *
 * Redesign (DESIGN.md): one brand surface — the quiet vertical
 * navy-gradient plus the crest's star lattice fading out from the top
 * (AuthBackground) — beside a plain form panel. The drifting glow blobs,
 * walking robot mascots and sign-in confetti were removed.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { dict } = useLocale();
  const { theme } = useTheme();
  const center = AKIS_CENTER;
  const brand = dict.authBranding.akis;
  const FEATURES = [
    { icon: GraduationCap, text: brand.feature1 },
    { icon: ShieldCheck, text: brand.feature2 },
    { icon: Landmark, text: brand.feature3 },
  ];

  return (
    <div className="flex min-h-screen bg-white dark:bg-navy-950">
      {/* Branding panel (lg+) */}
      <aside className="relative isolate hidden w-[44%] max-w-[600px] flex-col justify-between overflow-hidden bg-navy-gradient p-12 text-white lg:flex xl:px-16">
        <AuthBackground patternId="auth-star-lattice" />

        <div className="relative">
          <CenterLogo center={center} />
        </div>

        <div className="relative max-w-md">
          <p className="text-[0.8125rem] font-medium text-gold-300">{brand.tagline}</p>
          <p className="mt-4 font-display text-[2.125rem] font-semibold leading-[1.18] text-white">{brand.headline}</p>
          <ul className="mt-12 border-t border-white/10">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5 border-b border-white/10 py-4 text-sm text-white/75">
                <Icon className="h-[18px] w-[18px] shrink-0 text-white/50" strokeWidth={1.75} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/45">
          © {new Date().getFullYear()} {center.name}
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        {/* Mobile-only logo (the branding panel above is hidden below lg).
            This panel's background flips with the active theme — white in
            light mode, navy-950 in dark — so `onLight` must track the
            *resolved* theme: a hardcoded `onLight` rendered navy-on-navy in
            dark mode. useTheme() is fed the server-resolved cookie on first
            render (see RootLayout/ThemeProvider), so there is no flash. */}
        <div className="mb-10 lg:hidden">
          <CenterLogo center={center} onLight={theme === "light"} />
        </div>
        {/* The sign-in form itself — the one thing on this page that must
            never fail to become visible. Plain CSS keyframe (no JS
            completion dependency; its before/after states are both normal,
            opaque CSS), and the only animation on the page. */}
        <div className="w-full max-w-[400px] animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
}
