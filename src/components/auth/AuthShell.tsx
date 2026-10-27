"use client";

import { GraduationCap, ShieldCheck, Landmark } from "lucide-react";
import { CenterLogo } from "./CenterLogo";
import { AuthBackground } from "./AuthBackground";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { DEFAULT_KNOWN_CENTER, type KnownCenter } from "@/lib/centers/knownCenters";
import type { ReactNode } from "react";

/** authBranding.akis/authBranding.aket keys derive from short_code — this
 * keeps that mapping in one explicit place instead of a `.toLowerCase()`
 * cast, which TypeScript can't narrow to the literal union on its own. */
function brandKeyFor(shortCode: KnownCenter["short_code"]): "akis" | "aket" {
  return shortCode === "AKET" ? "aket" : "akis";
}

/**
 * `center` reflects whichever institution the visitor is currently signing
 * in to/acting under — the pre-login choice on /login and /forgot-password
 * (src/lib/centers/loginCenterCookie.ts), or the already-known account's own
 * center on /devices/manage and /force-password-change (both reached with a
 * profile already resolved). Optional, defaulting to AKIS, so the other
 * AuthShell call sites that predate this feature (mfa/setup, mfa/verify,
 * welcome/*) keep their exact current (AKIS) branding untouched.
 *
 * Redesign (DESIGN.md): one brand surface — the quiet vertical
 * navy-gradient plus the crest's star lattice fading out from the top
 * (AuthBackground) — beside a plain form panel. The drifting glow blobs,
 * walking robot mascots and sign-in confetti were removed.
 */
export function AuthShell({ children, center = DEFAULT_KNOWN_CENTER }: { children: ReactNode; center?: KnownCenter }) {
  const { dict } = useLocale();
  const { theme } = useTheme();
  const brand = dict.authBranding[brandKeyFor(center.short_code)];
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
