/**
 * Shared `loading.tsx` fallback for every top-level dashboard section
 * (admin, teacher, student, parent, calendar, chatbot, documents, feedback,
 * messages, profile, settings — see the `loading.tsx` re-export in each of
 * those route folders). Next.js wraps the page (and every route nested
 * below it that doesn't define its own more specific `loading.tsx`) in a
 * `<Suspense>` boundary using this as the fallback — see
 * node_modules/next/dist/docs/01-app/02-guides/streaming.md
 * §"Page-level streaming with loading.js".
 *
 * Before this existed, there were zero `loading.tsx`/`<Suspense>`
 * boundaries anywhere in the app (grep confirmed it), so a navigation to
 * any dashboard page showed nothing at all — no skeleton, no spinner, the
 * previous page just sat there frozen — until the *entire* chain (auth
 * checks + the target page's own data queries) finished and the whole
 * page swapped in atomically. That's a direct match for "there's too much
 * delay switching between tabs": the app wasn't actually idle during that
 * window, it just gave the user zero feedback that anything was
 * happening.
 *
 * This boundary sits *inside* each role/section folder (e.g.
 * `(dashboard)/admin/loading.tsx`), i.e. below `(dashboard)/layout.tsx`
 * and the role layout (`admin/layout.tsx` etc.) in the component tree. So
 * the Sidebar/Topbar chrome in DashboardShell — rendered by the outer
 * layout — never unmounts or flashes; only the content area swaps to this
 * skeleton while the target page's own queries resolve.
 *
 * Deliberately plain CSS (`animate-pulse` is a stock Tailwind utility, no
 * Framer Motion) — consistent with this codebase's established preference
 * for CSS-driven animation over JS-driven animation for anything that
 * isn't a genuinely interactive, stateful transition (see FadeUp.tsx's
 * doc comment for the fuller rationale, and HANDOVER.md Part 4 §14).
 */
function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-navy-800 ${className}`} />;
}

export function DashboardLoading() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2.5">
          <Block className="h-7 w-56" />
          <Block className="h-4 w-72" />
        </div>
        <Block className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Block className="h-24" />
        <Block className="h-24" />
        <Block className="h-24" />
      </div>

      <div className="space-y-3">
        <Block className="h-4 w-40" />
        <Block className="h-64" />
      </div>
    </div>
  );
}

export default DashboardLoading;
