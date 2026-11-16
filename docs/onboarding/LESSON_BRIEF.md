# Lesson builder brief (Phase 3) — read fully before writing code

You are one of four parallel builders replacing **stub lessons** with real ones in the school app's new onboarding.
Repo `E:\Coding Projects\Claude\School App`, branch `mark/onboarding-v2` (checked out; framework commit `a21d43b`).
Three other builders are working in the same checkout at the same time on other folders.

## Read first
1. `AGENTS.md`, `DESIGN.md` (navy ink, IBM Plex, one animation per change, no mascots/confetti/blobs).
2. `docs/ONBOARDING_PLAN.md`, especially **"Phase 1 rulings"** (binding).
3. `docs/onboarding/FEATURE_MAP.md`: the **only** source for what each feature does and who can see what. Never invent a
   behaviour, button, notification or permission that the map doesn't confirm. If the map is unsure, say less.
4. `src/components/onboarding/lessons/README.md` (the contract), `src/lib/onboarding/types.ts`,
   `src/components/onboarding/practice/kit.tsx`, one existing stub in your folder, and `LessonScreen.tsx` to see how your
   lesson is rendered.
5. For each feature, open the REAL page and components (`src/app/(dashboard)/...`) so the practice copy looks and
   behaves like the real thing (same labels, columns, status chips, buttons, empty states, validation messages).

## Hard rules
- **Edit only files inside your own folder** `src/components/onboarding/lessons/<your-group>/`. Do not edit the
  kit, framework, registry, other groups' folders, global dictionaries, or anything else. If you need a helper the kit
  lacks, create it inside your folder. If you believe a framework change is truly needed, describe it in your report
  instead of making it.
- Keep each lesson's `id` and `navHref` exactly as the stub has them. Keep `since: 10`.
- Practice components are client components with **fake data only** (use `FakePeople` from the kit; add more fictional
  people in your folder if needed). **Never** import Supabase clients, server actions, `@/lib/auth`, `server-only`, or
  call `fetch`. Nothing may be saved anywhere except React state.
- Wrap every practice screen in `PracticeFrame`. Lazy-load each Practice with `next/dynamic(..., { ssr: false })` the
  way the stub does, one file per practice component, so the flow stays light.
- All text in **English and Arabic** inside your lesson modules (identical task ids, same number of tasks, same
  order). Modern Standard Arabic, natural not literal; school context (e.g. الحضور، الواجبات، ولي الأمر).
  Practice UI strings too: switch on `locale`. Use logical CSS (`ms-`, `me-`, `ps-`, `start-`, `text-start`) so RTL
  works.
- Lesson text quality: plain words a busy teacher or parent understands; `what` = 2–3 short paragraphs; `useWhen` one
  sentence; `visibility.seenBy` / `notSeenBy` as short role phrases ("The student", "Their parents", "Admins",
  "Other parents"); `note` for one important caveat. For level "new", practice screens should show a little more
  inline guidance (`props.level`).
- **Tasks: 2–4 per lesson, done by actually using the practice UI** (filling a field, clicking the real-looking
  button, choosing an option), never by a "Done" button. Call `completeTask(id)` when the action really happens.
  Wrong or invalid actions should be explained in-place the way the real app does (e.g. the real validation text).
  A task must be completable at 390 px wide and by keyboard. Each task's `hint` says exactly what to click.
- Phone vs computer: lay out for narrow widths first; tables become stacked cards under ~640 px if the real page does so.
- Accessibility: real buttons/inputs/labels, visible focus, no colour-only status, respect reduced motion.

## Verify before reporting (do NOT run `next build` or `next dev`; Mark does that once all four are done)
- `npx tsc --noEmit` (errors outside your folder may come from a parallel builder mid-edit: re-run once; report only
  errors in your folder).
- `npx eslint src/components/onboarding/lessons/<your-group>`.
- `node scripts/onboarding.test.ts` (it covers every lesson; failures in other folders aren't yours, but yours must pass).

## Report
Files created/changed, a table of lessons (id, tasks), any FEATURE_MAP fact you relied on that seemed doubtful, any
framework change you'd want, and what you did not verify. Do not commit.
