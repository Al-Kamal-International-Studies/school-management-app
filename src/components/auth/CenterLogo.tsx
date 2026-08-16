import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { centerCrestSrc } from "@/lib/centers/branding";
import type { KnownCenter } from "@/lib/centers/knownCenters";

/**
 * Center-aware equivalent of ui/Logo.tsx's <Logo>, used only inside the
 * auth shell (AuthShell's branding panel + mobile logo) — the one place in
 * this app where the rendered brand mark needs to track the pre-login
 * center selection instead of being permanently AKIS. Every other <Logo>
 * call site (Sidebar, the welcome flow) is deliberately left untouched —
 * those are app-wide chrome, not part of this pre-login flow.
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
