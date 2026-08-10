import { cn } from "@/lib/utils";

/**
 * The official Al Kamal International Studies crest. Use `onLight` when
 * placing it on a light/white surface (renders the navy-ink version) —
 * the default (dark surfaces, e.g. the navy sidebar/login panel) renders
 * the white-ink version. Never place the wrong variant on the wrong
 * background (white-on-white or navy-on-navy is invisible).
 */
export function LogoMark({ className, onLight = false }: { className?: string; onLight?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={onLight ? "/brand/crest-navy.png" : "/brand/crest-white.png"}
      alt="Al Kamal International Studies crest"
      className={cn("h-full w-full object-contain", className)}
    />
  );
}

export function Logo({
  className,
  showWordmark = true,
  onLight = false,
}: {
  className?: string;
  showWordmark?: boolean;
  onLight?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-10 w-10 shrink-0">
        <LogoMark onLight={onLight} />
      </div>
      {showWordmark && (
        <div className="font-display leading-tight">
          <p className={cn("text-[15px] font-semibold tracking-wide", onLight ? "text-navy-900" : "text-white")}>
            Al Kamal
          </p>
          <p className={cn("text-[10px] font-medium uppercase tracking-[0.18em]", onLight ? "text-gold-600" : "text-gold-400")}>
            International Studies
          </p>
        </div>
      )}
    </div>
  );
}
