import { Logo, LogoMark } from "@/components/ui/Logo";
import type { KnownCenter } from "@/lib/centers/knownCenters";

/**
 * The institution's crest + wordmark lockup. Single-institution app (AKIS
 * only, HANDOVER Part 37), so this simply renders ui/Logo.tsx; the `center`
 * prop is kept so the existing call sites (auth shell, sidebar) stay
 * unchanged.
 */
export function CenterLogo({
  className,
  showWordmark = true,
  onLight = false,
}: {
  center: KnownCenter;
  className?: string;
  showWordmark?: boolean;
  onLight?: boolean;
}) {
  return <Logo className={className} showWordmark={showWordmark} onLight={onLight} />;
}

/** Crest only, unsized (`h-full w-full`) — the caller sizes it via a wrapper. */
export function CenterMark({ className, onLight = false }: { center: KnownCenter; className?: string; onLight?: boolean }) {
  return <LogoMark className={className} onLight={onLight} />;
}
