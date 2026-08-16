import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { centerCrestSrc } from "@/lib/centers/branding";
import type { KnownCenter } from "@/lib/centers/knownCenters";

/**
 * Center-aware equivalent of ui/Logo.tsx's <Logo>. Originally used only
 * inside the auth shell (AuthShell's branding panel + mobile logo); also
 * used by Sidebar.tsx now (2026-08-16 pass) so the authenticated chrome
 * shows the account's *actual* center rather than being permanently AKIS —
 * see CenterMark below for the collapsed-rail (mark-only) equivalent.
 * welcome/splash and welcome/language are deliberately left on the plain
 * AKIS-only <Logo> — those screens render before any center has ever been
 * selected (before even the login picker), so there is nothing to be
 * center-aware about yet.
 *
 * For AKIS this renders byte-identical output to the plain <Logo> (same
 * crest-navy.png/crest-white.png, same hardcoded "Al Kamal" / "International
 * Studies" two-line wordmark) — zero visual regression for the existing,
 * far more heavily used center. For AKET it swaps in aket-seal.svg (the
 * only crest-shaped asset that center has yet — see branding.ts) and a
 * two-line wordmark derived from the center's own name by splitting off its
 * first two words, which happens to reproduce AKIS's exact hardcoded split
 * too ("Al Kamal" / "International Studies") — confirmed deliberately
 * rather than coincidentally: both institutions' names share the "Al Kamal
 * <rest>" shape.
 */
export function CenterLogo({
  center,
  className,
  showWordmark = true,
  onLight = false,
}: {
  center: KnownCenter;
  className?: string;
  showWordmark?: boolean;
  onLight?: boolean;
}) {
  if (center.short_code === "AKIS") {
    return <Logo className={className} showWordmark={showWordmark} onLight={onLight} />;
  }

  const words = center.name.trim().split(/\s+/);
  const line1 = words.slice(0, 2).join(" ") || center.name;
  const line2 = words.slice(2).join(" ");
  const crest = centerCrestSrc(center.short_code);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-10 w-10 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={onLight ? crest.light : crest.dark}
          alt={`${center.name} crest`}
          className="h-full w-full object-contain"
        />
      </div>
      {showWordmark && (
        <div className="font-display leading-tight">
          <p className={cn("text-[15px] font-semibold tracking-wide", onLight ? "text-navy-900" : "text-white")}>{line1}</p>
          {line2 && (
            <p className={cn("text-[10px] font-medium uppercase tracking-[0.18em]", onLight ? "text-gold-600" : "text-gold-400")}>
              {line2}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Center-aware equivalent of ui/Logo.tsx's <LogoMark> — the crest with no
 * wordmark, deliberately unsized (`h-full w-full`, same contract LogoMark
 * itself has always had) so the caller sizes it via a wrapping div with an
 * explicit height/width. Used by Sidebar's collapsed icon-rail, which needs
 * a compact 36px mark rather than the full lockup CenterLogo above renders.
 */
export function CenterMark({ center, className, onLight = false }: { center: KnownCenter; className?: string; onLight?: boolean }) {
  if (center.short_code === "AKIS") {
    return <LogoMark className={className} onLight={onLight} />;
  }

  const crest = centerCrestSrc(center.short_code);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={onLight ? crest.light : crest.dark}
      alt={`${center.name} crest`}
      className={cn("h-full w-full object-contain", className)}
    />
  );
}
