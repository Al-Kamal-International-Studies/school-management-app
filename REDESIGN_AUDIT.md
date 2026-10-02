# Redesign Audit — Al Kamal International Studies App

*Scan date: 2026-10-01. Scope: design system config, all `src/components/ui` primitives, the nav shell, the auth shell, and a representative cross-section of ~15 pages across admin/teacher/student/parent/settings/auth flows.*

## Headline finding

**This app does not exhibit the generic AI-design fingerprint the redesign checklist targets.** It has a deliberate, custom navy/gold brand driven through CSS variables (so it can re-skin per school center without touching component code), tinted shadows, a real custom font pairing, careful hover/active/focus states almost everywhere, real empty states, and an unusual amount of documented bug-fixing rigor (e.g. a portal-based `ConfirmDialog` fixing a real stacking-context bug, a hydration-safe sidebar-collapse preference, native-select-driven custom dropdowns for accessibility). It reads as a mature, actively-maintained production system, not a first-pass AI scaffold.

Because of that, this report is a short, specific punch list rather than a sweeping rewrite plan — consistent with the project's own standing rule to keep changes small, reviewable, and documented.

## Confirmed findings

### 1. No custom 404 or error page
Verified: no `not-found.tsx` or `error.tsx` exists anywhere under `src/app`. Every other failure/empty state in this app is custom-designed (see `EmptyState` in [Table.tsx](src/components/ui/Table.tsx)), but an unknown route or an uncaught render error currently falls through to Next.js's bare default page — a jarring drop in polish compared to the rest of the app.
**Fix:** add `src/app/not-found.tsx` and a root `src/app/error.tsx`, styled with the existing `AuthShell`/`Card` primitives (crest, a short message, a button back to the right dashboard).

### 2. One native `<select>` broke from the app's own dropdown component — ~~three~~ (corrected during implementation)
The app has a fully custom, animated, accessible dropdown (`Listbox` in [Listbox.tsx](src/components/ui/Listbox.tsx), used via `Select` in [Field.tsx](src/components/ui/Field.tsx)) used consistently everywhere else. The original scan flagged three files using a bare `<select className="input bg-white dark:bg-navy-900">`, but on closer inspection only one was actually the same kind of control:

- [admin/users/page.tsx:69](src/app/(dashboard)/admin/users/page.tsx:69) — the role filter, a genuine single-value dropdown. **Fixed** — swapped to `Select` from `Field.tsx`. It renders a real native `<select>` under the hood, so the plain `method="get"` filter form still submits correctly with or without JS.
- `admin/users/[id]/EditUserForm.tsx` and `admin/users/new/NewUserForm.tsx` — **left alone.** Both are `<select multiple>` list boxes for picking a parent's linked children, not single-value dropdowns. The app's `Listbox` component only supports single-select; forcing these into it would mean building new multi-select UI (checkboxes/pills/search), which is a real feature addition, not a styling fix. The native multi-select is actually a reasonable, accessible choice here — flagging it as a defect in the first pass was a mistake, corrected now.

### 3. No "skip to content" link anywhere
Every authenticated page renders a 14-20-item sidebar before the main content. A keyboard user must tab through the entire nav on every page load to reach the page's actual content. Everything else accessibility-related in this app is handled carefully (focus-visible rings, ARIA labels on icon buttons, `role="dialog"`/`aria-modal`, RTL support, `useReducedMotion` checks) — this is the one common a11y pattern missing.
**Fix:** one hidden-until-focused skip link at the top of `DashboardShell.tsx` pointing at the `<main>` element.

### 4. Password-visibility toggle has no hover/focus-visible state
[PasswordField.tsx:63](src/components/ui/PasswordField.tsx:63): the eye-icon toggle button has `transition-colors` but defines no `hover:`/`focus-visible:` classes — so the transition has nothing to animate to. Every comparable icon-only button elsewhere in the app (the file-remove button in `FileUpload.tsx`, the sidebar collapse toggle in `Sidebar.tsx`) defines an explicit hover background plus a focus ring.
**Fix:** add `hover:bg-slate-100 dark:hover:bg-white/10` and a `focus-visible:ring-2` to match sibling components.

### 5. Minor: a few inline text links skip the app's focus-visible convention
Example: the user-name link in [admin/users/page.tsx:104](src/app/(dashboard)/admin/users/page.tsx:104) is `className="hover:text-navy-600"` with no focus ring, while the dashboard's equivalent row-links (`ROW_LINK_CLASS` in `admin/page.tsx`) explicitly define `focus-visible:ring-2 focus-visible:ring-navy-400`. Low-severity (the link is still keyboard-reachable, just without a visible ring), but worth sweeping for consistency next time these files are touched.

## Explicitly NOT recommended

- **Font swap** — already a deliberate, licensed pairing (Plus Jakarta Sans + Lora), not default Inter.
- **Color palette cleanup** — the navy/gold system is intentional brand identity, re-themed per school center via CSS variables; touching it risks breaking that mechanism.
- **Replacing Lucide icons** — used consistently across 200+ files; swapping icon sets now is pure churn for a closed internal tool, not a visible win.
- **Generic card/shadow/empty-state fixes** — already implemented well (tinted shadows, real empty states, loading spinners).
- **Privacy-policy / cookie-consent links** — not applicable; this is a closed, login-only institutional app with no self-registration or public marketing pages.

## Suggested priority order

1. Add `not-found.tsx` + `error.tsx` (highest visibility, lowest risk).
2. Fix the `PasswordField` toggle button states (one file, no risk).
3. Add a skip-to-content link in `DashboardShell.tsx`.
4. Swap the role-filter native `<select>` for the existing `Select`/`Listbox` component.
5. Sweep remaining inline links for the focus-visible convention, opportunistically.

None of these touch the multi-center theming system, the brand palette, or any already-fixed animation/stacking-context bugs documented in `HANDOVER.md`.

## Status: fixes 1–4 applied (2026-10-01)

- **`src/app/not-found.tsx`** (new) — app-wide 404, resolves "back to dashboard" via the signed-in user's actual role (`dashboardPathForRole`), falls back to `/login` when signed out. Visually confirmed in-browser.
- **`src/app/error.tsx`** (new) — app-wide render-error boundary, `"use client"` per Next's convention, logs the error and offers "Try again" (`reset()`) and "Back to dashboard". Compiles clean; not forcibly triggered live (would have required temporarily injecting a throw into real code).
- **`src/components/ui/PasswordField.tsx`** — added `hover:`/`focus-visible:` classes to the show/hide toggle button, matching sibling icon buttons elsewhere. Confirmed via computed DOM classes in-browser.
- **`src/components/nav/DashboardShell.tsx`** — added a visually-hidden-until-focused skip-to-content link targeting a new `id="main-content"` on `<main>`. Compiles clean; not visually confirmed live — testing it requires an authenticated session, and this project's dev server points at the real production Supabase instance with no spare admin credentials available to this session (the real admin passwords are correctly redacted in `HANDOVER.md`). Worth a 10-second manual check: load any dashboard page, press Tab once, confirm a "Skip to content" pill appears top-left.
- **`src/app/(dashboard)/admin/users/page.tsx`** — role filter now uses the app's own `Select` component instead of a bare `<select>`. Same caveat as above: compiles clean, matches an already-proven usage pattern (identical to `NewUserForm.tsx`'s role select), but not visually re-confirmed live for lack of admin credentials.
- New dictionary keys added to **both** `en.ts` and `ar.ts` (`notFound.*`, `errorPage.*`, `common.skipToContent`), per this project's standing full-i18n-coverage rule.
- `npm run typecheck` and `npm run lint` both pass clean after all changes.
