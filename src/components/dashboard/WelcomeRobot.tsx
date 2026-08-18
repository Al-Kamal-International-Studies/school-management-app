import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/types";
import type { UserRole } from "@/lib/types/database.types";

/**
 * The "Welcome, {name}" heading, with a small robot mascot (speech bubble
 * above its head) sitting beside it. Shows up on all four dashboards
 * (admin/teacher/student/parent), per Muhammad's request that this appear
 * "whenever someone logs into their accounts."
 *
 * v3 (this pass): Muhammad asked for the mascot to stop sitting *behind* the
 * heading text (v2's whole design — see git history for that layout's own
 * doc comment) and instead sit beside it, on the trailing side. This is a
 * structural simplification, not just a style tweak: v2 needed a `relative
 * inline-block` wrapper around just the heading text, an absolutely-
 * positioned mascot layered under it with `z-index`, and a separate
 * absolutely-offset speech bubble reserving its own in-flow space above the
 * row (to dodge `<main>`'s `overflow-y-auto` clipping it — see v2's doc
 * comment for the full story). None of that machinery is needed once the
 * mascot isn't overlapping anything: it's now a plain flex sibling, and the
 * speech bubble is now genuinely the *mascot's* bubble — stacked directly
 * above its own head in normal flow — rather than a bubble anchored near the
 * heading that happened to read as the robot's.
 *
 * Layout: one flex row, `items-end` so the heading's baseline lines up with
 * the mascot's feet. The heading comes first in DOM order and the mascot
 * column comes last, which (deliberately, no `rtl:` overrides needed) means
 * the mascot renders on the trailing edge in both directions — the right in
 * LTR (what Muhammad asked for), the left in RTL — because a plain flexbox
 * row already follows the page's own writing direction.
 *
 * Server component, zero client JS: the mascot's art, its continuous wave
 * loop, and its mount entrance are all plain CSS/SVG (no Framer Motion —
 * this is used on literally every dashboard page, the same "don't ship a
 * motion library just for a decorative loop that runs on every route" call
 * already made for the sidebar, see HANDOVER Part 6 §10). Every entrance
 * animation here uses the existing `animate-fade-in-up` / `animate-pop-in`
 * utilities from tailwind.config.ts, both `animation-fill-mode: both` —
 * the exact property whose absence caused this project's worst production
 * bug (see HANDOVER §2). The quote rotates by time of day (see pickQuote
 * below) rather than Math.random() — this repo's lint config
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
    <div className={cn("flex max-w-full items-end gap-3", className)}>
      {/* `[data-tour="page-title"]` (see src/lib/tour/steps.ts) targets this
          element on the pages where `as="h1"` makes it the real page title —
          left undecorated by that attribute on admin/parent, where the
          existing "Overview"/child-name heading stays the tour's anchor
          instead, unchanged. */}
      <Heading
        data-tour={dataTour}
        className={cn(
          "font-display",
          isPageTitle
            ? "text-2xl font-semibold text-navy-900 dark:text-white"
            : "text-xl font-medium text-navy-700 dark:text-navy-300",
        )}
      >
        {dict.common.welcome}, {name}
      </Heading>

      {/* Mascot column: speech bubble stacked directly above the robot's own
          head, both centered on the robot's width. `shrink-0` keeps the
          mascot from being squeezed by a very long `name` — the heading
          wraps first (it has no `whitespace-nowrap`), the mascot never
          does. */}
      <div className="flex shrink-0 flex-col items-center" aria-hidden="true">
        <div
          className="relative mb-1.5 max-w-[9rem] animate-pop-in rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] leading-snug text-slate-600 shadow-card dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200 sm:max-w-[11rem] sm:px-3.5 sm:py-2.5 sm:text-xs"
          style={{ animationDelay: "480ms" }}
        >
          <p className="font-semibold text-navy-900 dark:text-white">{dict.welcomeRobot.greeting}</p>
          <p className="mt-0.5">{quote}</p>
          {/* Tail centered under the bubble, pointing straight down at the
              robot's head below — plain physical centering (`left-1/2
              -translate-x-1/2`), not a logical property: centering has no
              direction to get wrong, unlike v2's trailing-edge-anchored
              tail. */}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 border-b border-e border-slate-200 bg-white dark:border-navy-700 dark:bg-navy-800" />
        </div>

        <span className="block animate-fade-in-up" style={{ animationDelay: "140ms" }}>
          <RobotMascot className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16" />
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
 * The mascot itself: same head/body/eye construction as
 * src/components/auth/Robot.tsx, redrawn on a taller viewBox with two arms
 * in different poses — one raised and waving, one raised and still —
 * instead of Robot's two symmetrical side arms. No `rtl:` mirroring here
 * (v2 needed it so its static arm kept pointing back at the text it was
 * gripping; v3 doesn't overlap the text at all, so there's nothing for
 * either arm to point at — the same art reads fine unmirrored in both
 * directions).
 */
function RobotMascot({ className }: { className?: string }) {
  const accent = "#d4af37";

  return (
    <svg viewBox="0 0 86 80" className={className} aria-hidden="true">
      {/* waving arm */}
      <g className="animate-wave" style={{ transformOrigin: "64px 48px" }}>
        <line x1="64" y1="48" x2="78" y2="20" stroke="#cbd5e1" strokeWidth="9" strokeLinecap="round" />
        <circle cx="78" cy="20" r="6" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.2" />
      </g>

      {/* raised arm, static */}
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
