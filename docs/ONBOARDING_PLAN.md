# New onboarding ("Getting started") — plan for approval

Mark, 2026-11-16. Status: **approved by Muhammad 2026-11-16 with the default answers to D-1, D-2 and D-3.**

## Why the current tour goes

`src/lib/tour/*` + `src/components/tour/TourOverlay.tsx` (645 lines). It is a spotlight that rings a sidebar
link and shows one sentence. Problems:

- **Out of date.** Steps exist for 11 of admin's 18 sidebar items, 9 of teacher's 16, 9 of student's 14,
  5 of parent's 8. Missing entirely: ID cards, Password reset requests, Events, Documents,
  Message safety, Feedback, Chat oversight, Timetable builder, Teacher progress, Help assistant, the new
  Light Rail Messages, and more.
- **It explains nothing.** It names a page; it never says what you do there, how, or who else sees it.
- **Nothing hands-on.** People read 10 tooltips and still don't know how to mark attendance.
- **Nothing keeps it current.** A new sidebar item doesn't break any test, so the tour went stale without anyone noticing.

It is removed completely (files, dictionary keys, sidebar "Tutorial" button) and replaced by the flow below.

## The new flow: five chapters, full screen, click-through

Lives at a new route **`/welcome`** (full-screen, its own minimal shell, no sidebar), so it can be
reopened any time from the sidebar ("Getting started") and resumed where they left off.

### Chapter 1: Welcome + a few questions (≈30 s)
One question per screen, big tappable option cards, Back/Next, progress dots.

| Question | Who | Options | What it changes |
|---|---|---|---|
| Language | all | English / العربية | Switches the app immediately (RTL) |
| Look | all | Light / Dark / Match my device | Applies immediately |
| Mostly on | all | Phone / Computer / Both | Phone: shows "Add to home screen" + notification tips; layouts in the demos match |
| How used to school apps? | adults | New to this / Used some / Very comfortable | New: fuller explanations + extra hints in demos. Comfortable: short text, same demos |
| What will you do most? (pick up to 3) | teacher | Attendance, Homework, Exams & grades, Messaging parents, Timetable, Remarks/progress | Those lessons come first, marked "Your focus" |
| What matters most? (pick up to 3) | parent | Grades, Attendance, Messages from teachers, Events & documents | Same: reorders lessons |
| What do you want to check first? | student | Timetable, Homework, Grades, Messages | Same; simpler wording for younger students |
| What are you here to do? | admin | Set up classes & people, Admissions, Day-to-day approvals, Communication, Oversight & safety | Same |

### Chapter 2: Your app at a glance (≈30 s)
A real picture of **their own sidebar**, grouped (e.g. teacher: *Teaching* / *Class life* / *Talking to people* / *Help & you*).
Each item gets one plain sentence about what it does. Tapping an item jumps to its lesson.

### Chapter 3: Feature lessons (the core)
One lesson per sidebar item for that role, **focus items first**. Every lesson has the same three parts:

1. **What it's for**: two or three plain sentences, plus "you'll use this when…".
2. **Who can see this**: a small visibility panel with role badges, e.g.
   *Attendance you mark → seen by: the student, their parents, admins. Not seen by: other students, other parents, other teachers.*
   Every claim is checked against the database rules (RLS) and code before it ships (see Phase 1).
3. **Try it**: a **practice version** of the real screen with made-up people
   ("Practice: nothing here is real or saved"). A short task list on the side, ticked off live:
   *"Mark Omar absent → mark Lina late → Save."* Hints appear if they get stuck. Wrong actions are explained
   rather than blocked (e.g. send a rude word in the practice chat → it shows exactly the real safety-filter
   message and why). **Next unlocks when the tasks are done.**
   Then a final "Where to find it" card shows the sidebar spot and an "Open the real page" link.

The practice screens are self-contained client components with fake data. **They never write to the
database**, so no real announcements, attendance or messages can be created by accident.

### Chapter 4: Privacy & who sees what (≈1 min)
One summary table for their role, plus the key rules in plain words. Examples:
- Teachers: you message only your own students, their parents and admins; teachers can't message each other.
- Students: you can't see other students' grades or attendance.
- Everyone: messages pass through a safety filter. The school's oversight account can read chats (stated honestly).
- Admins: the audit log records admin actions.

### Chapter 5: Finish (≈30 s)
Recap checklist (lessons done ✓), then optional setup suited to the role: turn on notifications,
add to home screen (phone), passkey info for **teachers only** (students never see security prompts;
admins already have TOTP). A "Getting started" entry stays in the sidebar to replay any lesson.

### Lesson list (one per sidebar item; ★ = biggest practice)

- **Admin (18):** Overview, Users★ (create user, reactivate a locked account), Admissions★ (new
  application → review → accept), ID cards, Password resets (approve a request), Classes, Subjects,
  Timetable★ (place a period, see a clash refused), Progress, Leave requests (approve/reject), Events,
  Documents (upload + pick audience), Announcements★ (audience picker), Messages, Message safety★ (review a
  flagged message), Feedback, Audit log (filter), Settings (2FA, devices). **+ Chat oversight** only for the
  overseer account.
- **Teacher (16):** My classes, ID cards, My timetable, Timetable builder★, Attendance★, Assignments★
  (create + grade a submission), Exams, Grades★, Remarks, Progress, Calendar, Documents, Messages★
  (class group, a parent, safety filter), Help assistant, Feedback, Settings.
- **Student (14):** Dashboard, ID card, Timetable, Attendance, Assignments★ (open + submit), Exams,
  Grades, Leave★ (request leave), Calendar, Documents, Messages★ (reply to a teacher), Help assistant,
  Feedback, Settings.
- **Parent (8):** Dashboard★ (your child at a glance), ID card, Calendar, Documents, Messages★ (talk to a
  teacher), Help assistant, Feedback, Settings.

Shared features (Messages, Calendar, Documents, Help assistant, Feedback, Settings, ID card) use one practice
component with a role variant, so the parts that look the same stay the same.

### Rules the build follows
- English + Arabic for every string (RTL checked); DESIGN.md: navy ink, IBM Plex, one animation per change,
  **no mascots, confetti or blobs**; respects reduced motion; keyboard and screen-reader friendly; works at 390 px.
- **Can't skip, can pause:** "Continue later" saves progress; next login resumes it, and a slim banner
  ("Finish getting started — 6 of 16") shows until done. *(see decision D-2)*
- **Stays current:** a test fails if any sidebar item has no lesson for that role, and if EN/AR keys differ.
  A lesson carries a `since` version; when a new feature ships, returning users see only the new lesson(s),
  the same idea as the old "what's new" mechanism.
- **No database migration.** Completion reuses the existing `profiles.has_seen_tour` / `tour_version_seen`
  columns (version bumped to 10). Answers and in-progress state live on the device. *(see D-3)*
  This also avoids clashing with Jack's unmerged migrations 0050–0055.

## Decisions for Muhammad (defaults in bold)
- **D-1 Existing accounts:** all 27 current accounts already finished the old tour. **Show the new onboarding once
  to everyone on their next login** / only new accounts.
- **D-2 Skipping:** **can pause, can't skip; reminder banner until done** / allow skip / hard block (no app until finished).
- **D-3 Resume across devices:** **progress on the device; completion saved to the account (no migration)** /
  add a migration so progress and answers follow the account across devices.

## How the work runs (subagents: Sonnet 5.5, medium effort)
Branch `mark/onboarding-v2` from `main`. Claimed on the TEAM board first.

| Phase | Who | Output |
|---|---|---|
| 1. Feature & permission map | 1 subagent (read-only) | `docs/onboarding/FEATURE_MAP.md`: per role and sidebar item, what it does, the actions, and who can see what, **each fact cited to a file/RLS policy**. Mark checks it before anyone writes text from it. |
| 2. Framework | 1 subagent | `/welcome` route + shell, questions, chapter engine, progress/resume, auto-start, sidebar "Getting started", banner, lesson registry + staleness test, dev-only preview `/welcome/preview?role=…` (no sign-in, development builds only), remove old tour. |
| 3. Lessons & practice screens | 4 subagents in parallel, each with its own folders and string files so they don't collide | A: shared features. B: teacher. C: admin. D: student + parent. |
| 4. Review & verify | Mark (+ a review subagent) | code review of the whole diff; tsc, eslint, tests, `next build`; walk through all four roles in the browser (EN + AR, desktop + 390 px) via the dev preview; fix findings. |
| 5. Hand-off | Mark | Commit, HANDOVER Part 60, KNOWLEDGE.md, board: **review request for Jack**. **No push, no deploy**: that waits for Jack's review and your OK. |

**Not verified by this plan:** a real signed-in first login on production (needs a real account and a deploy).
The dev preview covers the flow itself; the auto-start and completion saving get checked in code and tests.

## Phase 1 rulings (Mark, 2026-11-16) — binding for every build phase

`docs/onboarding/FEATURE_MAP.md` is the source of truth for lesson text. Where it contradicts this plan, **the map wins**. Specifically:

1. **Route is `/getting-started`** (inside the authenticated `(dashboard)` group, full-screen, no sidebar). `/welcome` stays the public pre-login screen and is untouched.
2. Lessons describe what the app really does, never the plan's guesses: Admissions = one form that creates student + parent accounts, PDF and welcome email (no review/accept step); Password resets = "View account" / "Dismiss", the fix is "Set a new password" on the user page; Audit log = latest 200 entries, no filter, includes teacher actions; locked **admin** accounts can't be reactivated from Users.
3. Timetable builder lesson: say teachers can build and edit periods for classes in the school; don't promise "only your classes".
4. Notifications: only claim notifications the map confirms (e.g. parents are NOT notified of assignments/grades; nothing is sent for attendance, remarks, leave submissions, hand-ins, events, documents). Visibility panels describe what users see in the app.
5. Privacy chapter must state honestly: remarks/behaviour entries (including negative) and progress comments are visible to the student and their parents; admins can read flagged/blocked message text in Message safety; only the oversight account reads whole chats.
6. Student "submit" practice = "Mark as Submitted" (no upload).
7. **Look question: Light / Dark only.** Language question comes first; switching locale reloads the page, so onboarding progress must be saved to localStorage before the switch and resume after.
8. Practice screens show every string in both English and Arabic from onboarding dictionaries, even where the real screen still has hard-coded English.
9. Device-cap / lockout facts in the security part: students skip forced password change and 2FA/passkey prompts, but still have the 3-device cap and 3-strike lock.
10. Completion: set `has_seen_tour = true` and `tour_version_seen = 10` via a renamed server action. Auto-start when `has_seen_tour` is false OR `tour_version_seen < 10` (D-1: everyone sees it once).
11. Chat oversight lesson only when `canOverseeChats` is true (already fetched in the dashboard layout; pass it through).
