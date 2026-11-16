# Writing onboarding lessons

The "Getting started" flow (`/getting-started`) teaches each sidebar item with a
short lesson: what it is for, who can see it, and a hands-on practice screen
with made-up people. This file is the contract for writing those lessons.

## Where things live

| Thing | Path |
|---|---|
| Lesson types (the contract) | `src/lib/onboarding/types.ts` |
| Registry (concatenates the four index files) | `src/lib/onboarding/registry.ts` |
| Practice kit (`PracticeFrame`, `FakePeople`, `useFakeToast`, `FakeTable`, `FakeForm`) | `src/components/onboarding/practice/kit.tsx` |
| Framework strings (flow UI only) | `src/lib/onboarding/i18n/framework.ts` |
| Lessons | `src/components/onboarding/lessons/<owner>/` |
| Stub helper (placeholders) | `src/components/onboarding/lessons/stub.ts` (delete when no stub is left) |

## Ownership: one index file per author

Each index file exports exactly one array. You own your folder and nothing else.

| Index file | Export | Hrefs it must cover |
|---|---|---|
| `shared/index.ts` | `sharedLessons` | `/messages` (all roles), `/calendar`, `/documents`, `/chatbot`, `/feedback` (teacher, student, parent), `/settings` (all roles) |
| `teacher/index.ts` | `teacherLessons` | every `/teacher/*` href in the sidebar |
| `admin/index.ts` | `adminLessons` | every `/admin/*` href, including `/admin/chat-oversight` (`requiresOverseer: true`) |
| `student-parent/index.ts` | `studentParentLessons` | every `/student/*` href, `/parent`, `/parent/id-card` |

Every index file already holds a **stub** for each href it owns, so the whole
flow works end to end. Replace a stub with a real `LessonDef`; keep its `id`
and `navHref`. Do not touch another author's index file, the registry, or the
framework strings.

## The contract

```ts
interface LessonDef {
  id: string;            // unique within a role
  navHref: string;       // exact sidebar href (or "/settings", "/admin/chat-oversight")
  roles: UserRole[];
  focusTags: FocusTag[]; // focus answers that move this lesson to the front
  since: number;         // 10 for every lesson of the first release
  text: { en: LessonText; ar: LessonText } | ((role: UserRole) => { en: LessonText; ar: LessonText });
  Practice: React.ComponentType<PracticeProps>; // lazy: next/dynamic, ssr: false
  requiresOverseer?: boolean;
}
```

- A lesson is one `(role, href)` pair. A lesson shared by several roles lists
  them in `roles`; use the function form of `text` when wording differs by role.
- `since`: when a feature ships later, add a lesson with `since: <new
  ONBOARDING_VERSION>` and bump `src/lib/onboarding/version.ts`. People who
  already finished onboarding then see only the newer lessons.
- Load the practice lazily so a lesson costs nothing until it is opened:

  ```ts
  const Practice = dynamic(() => import("./AttendancePractice"), { ssr: false });
  ```

### `LessonText` (one per language)

- `title`, `oneLiner` (one plain sentence, shown on the "app at a glance" screen).
- `what`: two or three short paragraphs. `useWhen` finishes "You'll use this when...".
- `visibility`: `seenBy` / `notSeenBy` are role names written in that language,
  plus an optional `note`. Describe what people **see in the app**, and only
  what `docs/onboarding/FEATURE_MAP.md` confirms (and the Phase 1 rulings in
  `docs/ONBOARDING_PLAN.md`). Do not invent notifications.
- `tasks`: `{ id, label, hint }`. **Task ids are identical in `en` and `ar`**
  and the number of tasks must match. "Next" unlocks when all are done.
- `whereToFind`: where the feature lives, e.g. "Attendance, in the sidebar".

### `PracticeProps`

`role, locale, dir, level, device, completedTasks, completeTask(taskId)`.
Call `completeTask` when the person does the thing (it is idempotent and never
throws). `level === "new"` means they asked for extra help; the flow already
shows hints, so keep the practice itself the same for every level. Lay out for
`device === "phone"` (390 px wide) as well as desktop.

## Rules

1. **Strings: English and Arabic live in the lesson module**, in a local
   object or the `text` field. Never add keys to the global dictionaries
   (`src/lib/i18n/dictionaries`) and never read `useLocale()`. Practice screens
   must work in both languages from the `locale` prop alone, even where the
   real page is still hard-coded English.
2. **Never import server actions or Supabase clients in a practice component.**
   Nothing under `src/components/onboarding/` may import `@/lib/supabase/*` or
   any `actions` module (the only exception is the flow shell's own
   `@/lib/onboarding/actions`). Practice data is local state and `FakePeople`.
   A practice screen must never write to the database, send a push, or call a
   route handler.
3. Use the real UI primitives (`@/components/ui/*`), the Tailwind tokens and
   `DESIGN.md`: navy ink, IBM Plex, sentence case, one filled button per
   screen, no emoji, no mascots or confetti, one animation per change, logical
   CSS properties (`ms-`, `pe-`, `text-start`, `rtl:rotate-180`) so Arabic
   (RTL) is right. Use `PracticeFrame` for the labelled surface.
4. Input `name`s become DOM ids: prefix them `practice-` to avoid clashing.
5. Made-up people only (`FakePeople`). No real names from the database.
6. Wrong actions should be explained, not blocked (for example, show the real
   safety-filter wording when a rude word is sent).
7. Keep it keyboard-operable with visible focus, and respect
   `prefers-reduced-motion` (the global CSS already does for CSS animation).

## Testing your lesson

1. `node scripts/onboarding.test.ts` checks the registry (every sidebar href has
   exactly one lesson per role, ids unique, EN/AR present with matching task
   ids, framework key parity, no forbidden imports).
2. `npx tsc --noEmit` and `npx eslint src/components/onboarding`.
3. Look at it in the dev server, no sign-in needed (development only):

   ```
   npm run dev
   http://localhost:3000/dev/onboarding-preview?role=teacher
   http://localhost:3000/dev/onboarding-preview?role=admin&overseer=1&locale=ar
   ```

   `role` is `admin | teacher | student | parent`, `locale` is `en | ar`,
   `overseer=1` adds the Chat oversight lesson. Check light, dark, Arabic, a
   390 px viewport, and the keyboard. Nothing is saved on the server; progress
   goes to `localStorage` under `onboarding:v10:preview-<role>`.
