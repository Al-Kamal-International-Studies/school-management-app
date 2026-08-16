import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/types";
import type { UserRole } from "@/lib/types/database.types";

/**
 * The "Welcome, {name}" heading, with a small robot mascot overlapping its
 * trailing edge — genuinely layered *behind* the text via z-index, not just
 * floating beside it — one hand gripping into the last letters, the other
 * free hand waving, and a speech bubble above with a greeting + a short
 * role-appropriate quote. Shows up on all four dashboards (admin/teacher/
 * student/parent), per Muhammad's request that this appear "whenever
 * someone logs into their accounts."
 *
 * v2 (this pass) rewrites the layout after Muhammad reported three real
 * bugs in the shipped v1: (1) the mascot wasn't actually behind the text —
 * v1 rendered Heading and the mascot as plain flex siblings with a small
 * gap, so nothing ever overlapped, regardless of the rotation/mirror
 * transforms applied to the art; (2) the "Welcome, {name}" line and the
 * page's own "Overview"/child-name heading directly below it (on admin/
 * parent) were the same weight and nearly the same size, reading as two
 * competing headlines; (3) the speech bubble was `position:absolute` with
 * a negative `bottom` offset that could push it above the very top of the
 * page — and since this is normally the first thing rendered inside
 * `<DashboardShell>`'s `<main className="overflow-y-auto ...">` (see
 * src/components/nav/DashboardShell.tsx), there was no headroom above it
 * for the bubble to render into: `overflow-y-auto` clips anything painted
 * above the scrolled-to-top container's own top edge, which sliced the top
 * off the bubble. Root-caused by reproducing the exact geometry (wrapper
 * height ~48-56px, bubble `bottom-[85%]` of that, bubble content ~46-50px
 * tall) rather than guessing.
 *
 * Fixes, in order:
 * 1. The bubble is now a real in-flow block that sits *above* the heading
 *    row in normal document flow (not an absolutely-positioned overlay
 *    poking out above its own container). An in-flow element can't be
 *    clipped by an ancestor's `overflow-y-auto` the way an
 *    absolutely-offset one can — it always renders inside the space it
 *    itself reserves, however tall its content turns out to be (longer
 *    Arabic quotes wrapping to 3 lines, a longer name, etc. all just make
 *    the reserved space taller, automatically, no magic px value to keep
 *    in sync).
 * 2. The mascot is `position:absolute` inside a wrapper that hugs only the
 *    Heading text (`relative inline-block`), anchored past the text's own
 *    trailing edge with `inset-inline-end` (a genuinely logical CSS
 *    property — resolves to the right in LTR, the left in RTL, no rtl:
 *    variant needed) and vertically centered on the heading's own line box
 *    (`top-1/2 -translate-y-1/2`) rather than bottom-aligned. Centering
 *    guarantees the mascot's own vertical middle — where its grip hand and
 *    body sit — actually falls across the text's ink band regardless of
 *    which of the two font sizes below is in play, instead of needing
 *    per-variant offset tuning. The Heading gets `relative z-10`, the
 *    mascot wrapper gets `z-0`, so the text visually paints *over* the
 *    mascot wherever they overlap and the mascot shows through everywhere
 *    else (the gaps between glyphs, and the ~1/4 of its own width that
 *    protrudes past the text's trailing edge) — a real "emerging from
 *    behind the text" composition, not a `z-index` no-op.
 * 3. "Welcome, {name}" now has two distinct visual roles depending on
 *    `as`, matching how it's actually used: when it's the page's one true
 *    h1 (teacher/student, which have no other heading), it keeps the
 *    exact size/weight/color every other h1 in this app uses
 *    (`font-display text-2xl font-semibold text-navy-900 dark:text-white`
 *    — literally the same classes as admin's "Overview" h1). When the page
 *    already has its own h1 right below it (admin's "Overview", parent's
 *    child-name heading), this line is deliberately lighter — smaller
 *    weight, a step lighter in color — so it reads as a lead-in greeting
 *    the real heading follows, not a second heading competing with it.
 *
 * Visual language still deliberately reuses src/components/auth/Robot.tsx
 * and WalkingRobots.tsx's palette/proportions (same head/body/eye shapes,
 * same slate + gold accent) rather than inventing an unrelated character.
 *
 * Server component, zero client JS: the mascot's art, its continuous wave
 * loop, and its mount entrance are all plain CSS/SVG (no Framer Motion —
 * this is used on literally every dashboard page, the same "don't ship a
 * motion library just for a decorative loop that runs on every route" call
 * already made for the sidebar, see HANDOVER Part 6 §10). Every entrance
 * animation here uses the existing `animate-fade-in-up` / `animate-pop-in`
 * utilities from tailwind.config.ts, both `animation-fill-mode: both` —
 * unchanged from v1, and deliberately not touched, since that's the exact
 * property whose absence caused this project's worst production bug (see
 * HANDOVER §2). The quote rotates by time of day (see pickQuote below)
 * rather than Math.random() — this repo's lint config
 * (react-hooks/purity) rejects Math.random() in a component body outright.
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
   * then renders as a visually lighter lead-in line, so the page keeps
   * exactly one h1 for a11y/outline purposes, and the two lines read as a
   * clear hierarchy instead of two same-weight headings.
   */
  as?: "h1" | "p";
  /** Only meaningful when `as="h1"` — see the comment on the element below. */
  dataTour?: string;
  className?: string;
}) {
  const quotes = QUOTES_BY_ROLE[role](dict);
  const quote = pickQuote(quotes);
  const Heading = as;
  const isPageTitle = as === "h1";

  return (
    <div className={cn("inline-flex max-w-full flex-col items-end", className)}>
      {/* Speech bubble — real in-flow block (see fix #1 in the doc comment
          above): it reserves its own height above the heading row instead
          of being absolutely offset above the page's own top edge, so it
          cannot be clipped by <main>'s `overflow-y-auto` regardless of
          scroll position, quote length, or locale. `items-end` on the
          outer column keeps this aligned with whichever edge the mascot
          actually sits near (the heading's trailing edge), in both
          directions, without an rtl: override. */}
      <div
        className="relative mb-2 max-w-[10.5rem] animate-pop-in rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs leading-snug text-slate-600 shadow-card dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 sm:mb-2.5 sm:max-w-[13rem] sm:text-sm"
        style={{ animationDelay: "480ms" }}
        aria-hidden="true"
      >
        <p className="font-semibold text-navy-900 dark:text-white">{dict.welcomeRobot.greeting}</p>
        <p className="mt-0.5">{quote}</p>
        <span className="absolute end-4 top-full h-2.5 w-2.5 rotate-45 border-b border-e border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-800" />
      </div>

      {/* Heading + mascot. `relative inline-block` shrink-wraps to exactly
          the heading text's own box, so `inset-inline-end` on the mascot
          below anchors to the *text's* trailing edge specifically — not
          the row's, not the page's — regardless of how long `name` is. */}
      <div className="relative inline-block max-w-full">
        {/* `[data-tour="page-title"]` (see src/lib/tour/steps.ts) targets
            this element on the pages where `as="h1"` makes it the real page
            title — left undecorated by that attribute on admin/parent,
            where the existing "Overview"/child-name heading stays the
            tour's anchor instead, unchanged. `relative z-10` is what makes
            the text paint *over* the mascot below wherever they overlap —
            without it the mascot (an absolutely-positioned sibling) would
            stack above plain in-flow text by default. */}
        <Heading
          data-tour={dataTour}
          className={cn(
            "relative z-10 font-display",
            isPageTitle
              ? "text-2xl font-semibold text-navy-900 dark:text-white"
              : "text-xl font-medium text-navy-700 dark:text-navy-300",
          )}
        >
          {dict.common.welcome}, {name}
        </Heading>

        {/* Mascot: `z-0` (behind the heading's `z-10`), vertically centered
            on the heading's own line box, protruding past its trailing
            edge. The result: the mascot's grip-hand side overlaps into the
            text (occluded by the glyph ink wherever they coincide, visible
            in the gaps everywhere else — a real "behind the text" read),
            while its free waving hand sits past the text's own edge,
            entirely unobstructed. */}
        {/* Positioning lives on this outer span alone (`top-1/2
            -translate-y-1/2` for centering, `end-[...]` for the trailing
            overlap) — deliberately *not* combined with the entrance
            animation below on the same element. A CSS keyframe animation
            that targets `transform` replaces that element's entire
            computed transform for the animation's duration and after
            (fill-mode `both`), it doesn't compose with a separately-set
            static transform utility. Putting `-translate-y-1/2` and
            `animate-fade-in-up` on one element was tried and measured live
            (getBoundingClientRect + getComputedStyle) to silently break
            the centering: once the animation finished, the element's
            transform was the keyframe's own resting `translateY(0)`, not
            `translateY(-50%)`, so the mascot rendered ~30px lower than
            intended, overlapping the text by only a sliver instead of
            straddling it. Splitting "where it sits" (this span) from "how
            it enters" (the inner span) from "its tilt/mirror" (the SVG
            itself, via RobotMascot's className) keeps all three transforms
            on separate elements so none of them can clobber another. */}
        <span
          className="pointer-events-none absolute top-1/2 z-0 end-[-0.85rem] -translate-y-1/2 sm:end-[-1.1rem]"
          aria-hidden="true"
        >
          <span className="block animate-fade-in-up" style={{ animationDelay: "140ms" }}>
            <RobotMascot className="h-12 w-12 rotate-[10deg] rtl:scale-x-[-1] sm:h-14 sm:w-14 lg:h-16 lg:w-16" />
          </span>
        </span>
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
 * mascot for Arabic: the grip hand is drawn at the art's own local-start
 * side (x=8, left in unmirrored LTR) and the wave hand at local-end (x=78).
 * In LTR the mascot sits past the heading's trailing (right) edge, so an
 * unmirrored grip hand at local-left already points back toward the text —
 * no mirroring needed. In RTL the heading's trailing edge is the left side,
 * so the mascot ends up sitting to the text's *left* (via the
 * `inset-inline-end` logical positioning on the wrapper), meaning the grip
 * hand now needs to point right, toward the text, instead — `scale-x-[-1]`
 * flips the art so the local-left grip hand renders on the visual-right,
 * keeping it pointed at the text in both directions from one utility class.
 */
function RobotMascot({ className }: { className?: string }) {
  const accent = "#d4af37";

  return (
    // No role/aria-label needed — the whole mascot wrapper above is already
    // aria-hidden (purely decorative; the real "Welcome, {name}" text is
    // the actual heading, not hidden).
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
