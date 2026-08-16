import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/types";
import type { UserRole } from "@/lib/types/database.types";

/**
 * The "Welcome, {name}" heading, with a small robot mascot climbing up
 * diagonally from behind it — one hand gripping the end of the text, the
 * other free hand waving — and a speech bubble popping in above its head
 * with a greeting + a short role-appropriate quote. Shows up on all four
 * dashboards (admin/teacher/student/parent), per Muhammad's request that
 * this appear "whenever someone logs into their accounts."
 *
 * Server component, zero client JS: the mascot's art, its continuous wave
 * loop, and its mount entrance are all plain CSS/SVG (no Framer Motion —
 * this is used on literally every dashboard page, the same "don't ship a
 * motion library just for a decorative loop that runs on every route" call
 * already made for the sidebar, see HANDOVER Part 6 §10). The quote rotates
 * by time of day (see pickQuote below) rather than Math.random() — this
 * repo's lint config (react-hooks/purity) rejects Math.random() in a
 * component body outright ("Cannot call impure function during render");
 * `new Date()` doesn't trip the same rule (teacher/student dashboards
 * already call it directly in their own component bodies, e.g.
 * `jsDayToDbDay(new Date().getDay())`), so a deterministic-but-changing
 * pick built from it stays within that rule while still satisfying the
 * spec's explicit "picked randomly (or rotating)" allowance.
 *
 * Visual language deliberately reuses src/components/auth/Robot.tsx's
 * palette and proportions (same head/body/eye shapes, same slate + gold
 * accent) rather than inventing an unrelated character — this app already
 * has a mascot.
 */
export function WelcomeRobot({
  name,
  role,
  dict,
  as = "h1",
  dataTour,
  className,
}: {
  name: string;
  role: UserRole;
  dict: Dictionary;
  /**
   * "h1" when this line is the page's one true title (teacher/student,
   * which had no other heading). "p" when the page already has its own h1
   * elsewhere (admin's "Overview", parent's child-name heading) — this
   * then renders as a visually-similar-but-not-actually-a-second-h1 line,
   * so the page keeps exactly one h1 for a11y/outline purposes.
   */
  as?: "h1" | "p";
  /** Only meaningful when `as="h1"` — see the comment on the element below. */
  dataTour?: string;
  className?: string;
}) {
  const quotes = QUOTES_BY_ROLE[role](dict);
  const quote = pickQuote(quotes);
  const Heading = as;

  return (
    <div className={cn("flex flex-wrap items-end gap-1.5 sm:gap-2", className)}>
      {/* This is the one element `[data-tour="page-title"]` targets (see
          src/lib/tour/steps.ts) on the pages where `as="h1"` makes it the
          real page title — left undecorated by that attribute on admin/
          parent, where the existing "Overview"/child-name heading stays
          the tour's anchor instead, unchanged. */}
      <Heading
        data-tour={dataTour}
        className={cn(
          "font-display font-semibold text-navy-900 dark:text-white",
          as === "h1" ? "text-2xl" : "text-xl",
        )}
      >
        {dict.common.welcome}, {name}
      </Heading>

      <div
        className="relative -ms-1 mb-0.5 shrink-0 animate-fade-in-up"
        style={{ animationDelay: "180ms" }}
        aria-hidden="true"
      >
        {/* Centered over the mascot (flex justify-center on a full-width
            wrapper) rather than edge-anchored — direction-agnostic, so it
            doesn't need separate LTR/RTL cases, and safe regardless of
            whether the mascot lands beside the heading on the same line or
            wraps onto its own line below a long name (where it sits flush
            against the row's start edge with nothing beside it — an
            end-anchored bubble was measured overflowing off-screen in that
            exact case during verification; centering fixes it because it
            grows symmetrically instead of assuming which side has room). */}
        <div className="absolute inset-x-0 bottom-[85%] z-10 flex justify-center">
          <div
            className="w-max max-w-[9rem] animate-pop-in rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-[11px] leading-snug text-slate-600 shadow-card dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 sm:max-w-[12rem] sm:text-xs"
            style={{ animationDelay: "560ms" }}
          >
            <p className="font-semibold text-navy-900 dark:text-white">{dict.welcomeRobot.greeting}</p>
            <p className="mt-0.5">{quote}</p>
            <span className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-e border-slate-200/70 bg-white dark:border-navy-700 dark:bg-navy-800" />
          </div>
        </div>

        <RobotMascot className="h-12 w-12 rotate-[14deg] rtl:scale-x-[-1] sm:h-14 sm:w-14" />
      </div>
    </div>
  );
}

const QUOTES_BY_ROLE: Record<UserRole, (dict: Dictionary) => string[]> = {
  student: (dict) => dict.welcomeRobot.studentQuotes,
  teacher: (dict) => dict.welcomeRobot.teacherQuotes,
  parent: (dict) => dict.welcomeRobot.parentQuotes,
  admin: (dict) => dict.welcomeRobot.adminQuotes,
};

/** Rotates through the curated set every few hours rather than picking one
 * quote and sticking with it forever — different visits across a day/week
 * see different quotes, without reaching for Math.random() (see the doc
 * comment above on why). */
function pickQuote(quotes: string[]): string {
  const hoursSinceEpoch = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 3));
  return quotes[hoursSinceEpoch % quotes.length] ?? quotes[0]!;
}

/**
 * The mascot itself: same head/body/eye construction as Robot.tsx, redrawn
 * on a taller viewBox with two arms in different poses instead of Robot's
 * two symmetrical side arms — one reaching up (the "gripping" hand), one
 * raised and waving. `rtl:scale-x-[-1]` on the caller mirrors the whole
 * mascot for Arabic: since the mascot sits in normal document flow right
 * after the heading (not absolutely pinned over specific glyphs — text
 * length varies too much across names/locales for that to be reliable),
 * flexbox alone already puts it on the correct trailing side in both
 * directions (last DOM child = end of the line, whichever side that is).
 * The mirror is what keeps the gripping hand pointed *back toward the
 * text* rather than away from it once that trailing side flips from right
 * (LTR) to left (RTL) — composing scaleX(-1) after the existing rotation
 * flips the diagonal lean along with the artwork, so both the tilt and the
 * arm-side reversal come from one utility class instead of two competing
 * rotation values.
 */
function RobotMascot({ className }: { className?: string }) {
  const accent = "#d4af37";

  return (
    // No role/aria-label needed — the whole mascot+bubble wrapper above is
    // already aria-hidden (purely decorative; the real "Welcome, {name}"
    // text is the actual heading, not hidden).
    <svg viewBox="0 0 86 80" className={className} aria-hidden="true">
      {/* wave arm (drawn first so the grip arm's hand overlaps it slightly
          less awkwardly at the shoulder) */}
      <g className="animate-wave" style={{ transformOrigin: "64px 48px" }}>
        <line x1="64" y1="48" x2="78" y2="20" stroke="#cbd5e1" strokeWidth="9" strokeLinecap="round" />
        <circle cx="78" cy="20" r="6" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.2" />
      </g>

      {/* grip arm — static, reaching up toward the text */}
      <line x1="20" y1="48" x2="8" y2="20" stroke="#cbd5e1" strokeWidth="9" strokeLinecap="round" />
      <circle cx="8" cy="20" r="6" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.2" />

      {/* antenna */}
      <line x1="42" y1="2" x2="42" y2="13" stroke="#e2e8f0" strokeWidth="2" />
      <circle cx="42" cy="2" r="3.2" fill={accent} />

      {/* head */}
      <rect x="24" y="13" width="36" height="26" rx="9" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx="35" cy="26" r="4.5" fill="#0f2131" />
      <circle cx="49" cy="26" r="4.5" fill="#0f2131" />
      <circle cx="36.3" cy="24.7" r="1.3" fill="#fff" />
      <circle cx="50.3" cy="24.7" r="1.3" fill="#fff" />

      {/* body */}
      <rect x="20" y="41" width="44" height="28" rx="10" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx="42" cy="55" r="6" fill={accent} opacity="0.9" />

      {/* legs */}
      <rect x="26" y="67" width="9" height="8" rx="3" fill="#94a3b8" />
      <rect x="49" y="67" width="9" height="8" rx="3" fill="#94a3b8" />
    </svg>
  );
}
