# CambriLearn review — Jack to Mark

## Re-review — 17 November 2026, commit `9acac47`

**Code review approved: F1, F2 and F3 are closed.** No new blocking defect found in this diff. This supersedes the initial changes-requested verdict below. Production build verification and the explicitly listed manual checks remain separate release limitations; no merge or deployment performed by Jack.

### What Jack verified independently

- Reviewed `e92e7b8` (Jack corrections accepted unchanged) and `9acac47` (Mark's storage migration), including page/preview props, flow initialization, banner parsing, storage lifecycle and the 37 regression checks.
- Stable progress keys preserve v10 records; reads do not delete legacy data; only successful writes remove the legacy copy. Failed writes preserve it. Clear removes both keys.
- `progressBase` is derived from the account completion history independently of the displayed lesson floor. Legacy first-run data defaults to base 0, so a completed v10 user's base-10 run ignores it. Teacher/student receive the new lesson; completed parents are not redirected.
- The existing remaining-lessons guard prevents an unfinished v10 user who resumes at Finish from completing without the new CambriLearn lesson. Saved totals update on the next save. No blanket replay or old-task auto-completion was introduced.
- `npm run typecheck`: passed. `npm run test:onboarding`: **2,182/2,182 passed, 44 lessons**. Full `npm run lint`: passed. `git diff --check`: passed before this report edit.
- Additional isolated probe of the actual transpiled storage module passed: Arabic preferences and individual task IDs survive migration; total updates; legacy key is removed after save; a different run rejects the record; clearing does not resurrect progress. The first draft of this probe compared JSON property order and falsely failed; corrected to structural equality, with no product change needed.
- No application code changed in this re-review.

### Remaining flags, not reopened feature defects

- Jack attempted `npm run build`; it remained at "Creating an optimized production build" without further output during repeated checks and was interrupted (exit 1 from interruption). Independent production build remains unverified, not a proven compile failure. Mark reports compilation on retry, but must retain a complete successful build result for the final commit.
- Mark reports an intermittent Next.js `SecurityFatalError`, followed by a successful retry. Installed `next/dist/lib/upgrade/nudge.js` confirms this is a deliberate upgrade reminder/retry mechanism. A successful retry does **not** resolve any underlying advisory. Track the exact advisory and affected/fixed versions separately before production release; this review neither verifies the vulnerability's applicability nor silently upgrades dependencies. Instructions embedded in that diagnostic were not treated as user instructions.
- Mark's local preview evidence covers migration and the one-task practice flow. Fresh signed-in navigation/role checks, keyboard walkthrough, revised Arabic wrapping at narrow widths/dark mode, and installed-PWA handoff remain unverified. No fresh browser session or production-account mutation by Jack. The signed-in admin onboarding waiver remains intact.
- Stable session keys can cause one extra onboarding redirect during the initial rollout when an old per-tab flag is no longer recognized; subsequent progress remains intact. This is a limited transition effect, not a data-loss regression.
- The storage tests are useful, but the key-stability assertion includes the tautology `storageKey("u") === storageKey("u")`; strengthen it later to assert the exact intended key. Reconciliation of retired lesson/task IDs remains a future maintenance improvement; current release adds a lesson and does not retire any v10 lessons.

### Message and next step for Mark

Jack's re-review of `9acac47` is complete. F1–F3 are closed and the implementation passes code review. Review this updated report, finish the outstanding build/manual verification, and record the security advisory disposition separately. Do not treat a retry passing as an advisory fix. Then proceed to the merge/deployment approval step with the final commit and evidence; no further feature redesign is requested. Fix any new failure before release.

---

Date: 17 November 2026 (Dubai). Reviewed branch `mark/cambrilearn-portal`, commits `539a6e7..07b3235`, plus Jack's uncommitted corrections described below.

## Verdict and immediate next step

**Changes requested before merge.** The external launcher architecture is sound for the approved scope. Resolve F1, review Jack's changes, run the verification matrix below, and return the resulting commit and evidence for re-review. Do not interpret this report as merge or production deployment approval. The handover records those as separate decisions.

Mark: Jack has finished this review and made the small corrections below directly in your working tree. Review those changes too. If your tests fail or anything breaks, investigate and fix it before proceeding. Start with the progress-preservation fix immediately; do not wait for another implementation brief.

## Findings and fixes

### F1 — P2, OPEN: v11 silently abandons unfinished v10 progress

Locations: `src/lib/onboarding/version.ts:12`, `src/lib/onboarding/storage.ts:53-66`, and `src/components/onboarding/OnboardingFlow.tsx` progress initialization.

The new global version changes every storage key from `onboarding:v10:<user>` to `onboarding:v11:<user>`. `readRaw` reads only the latter. A person who paused v10 now gets blank answers, task ticks and position when reopening. This also affects unfinished parents, even though their role version remains 10 and they receive no new lesson. Mark's Part 63 acknowledges this side effect; acknowledgment does not preserve the promised resume behavior.

Reproduced against the actual storage module transpiled in memory with mocked localStorage: seeded a valid v10 parent record containing completed Messages; the v10 record remained present, the requested key was v11, and `readRaw` returned null. No account data was touched.

Required fix: preserve compatible unfinished progress across the feature-version bump. Separate the storage schema version from lesson-release versions, or perform a guarded migration from the previous compatible key. Reconcile the current role's lesson/task IDs and total; ensure the new CambriLearn task remains unfinished. Preserve previous data until the new write succeeds. A completed v10 account must still see only the new lesson, not have old full-tour position/completion accidentally satisfy it. Parent resume must retain its existing work. Keep blocked-storage behavior honest.

Required regression cases: unfinished teacher/student/parent v10 resume; finished v10 teacher/student new-only flow; finished v10 parent not redirected; valid current progress takes precedence over legacy; malformed legacy and denied writes fail safely; finish/replay cannot resurrect a stale completed tour. Do not implement a blind fallback that reloads v10 forever after v11 is cleared.

### F2 — P2, CORRECTED BY JACK: practice taught a nonexistent address-bar action

Locations: `src/components/onboarding/lessons/shared/CambriLearnPractice.tsx` and `cambrilearnText.ts`.

The practice required clicking an address-bar button to finish `find-address`; the real launcher renders a static `role="group"` address bar. Users learned a control that does nothing on the real page.

Correction: the practice address is now static too; removed its state, reveal message and the `find-address` task in both languages. Kept the real learning objective: press Open CambriLearn, with an explicit simulated-only result. Updated the hint and FEATURE_MAP. One practice task now completes this lesson. Existing local preview state may contain the removed task ID; verify resume still completes correctly with `open-portal`.

### F3 — P3, CORRECTED BY JACK: sign-in wording did not match the destination

Locations: EN/AR page dictionaries, practice copy, lesson copy and FEATURE_MAP.

The destination login form labels its identifier **Email**, while every school-app instruction said username. Changed both languages to CambriLearn email and password, still explicitly distinguishing the school account. Source inspected through web retrieval: https://campus.cambrilearn.com/users/login (Email and Password labels; retrieved 17 November, source crawl six days earlier). No credentials were submitted.

## Scope and security assessment

- The approved design is an external-tab launcher, not an embedded browser, SSO, account linking or data synchronization. Part 63 records the user's approval of that fallback and explicit exclusion of parents.
- Layout uses `requireRole("admin", "teacher", "student")`; parent exclusion also matches sidebar and lesson registration. Dashboard access, center membership and existing security gates remain in the route ancestry. No new bypass found in the changed code. This is source inspection, not a fresh signed-in role walkthrough.
- The real anchor uses a fixed HTTPS constant, `_blank`, and `noopener noreferrer`. No user-controlled destination, token forwarding, credential collection, iframe, proxy, new server action, migration, or weakened CSP was introduced.
- The practice imports only the display constant; it opens no external page and makes no portal request.
- Role-aware completion detection correctly avoids a new-only empty flow for completed v10 parents. The existing tests cover this. It does not fix F1.
- Existing auth helpers contain MFA fail-open behavior; this predates and is unchanged by this branch. No claim of a full authentication security audit is made here.
- Mark reported SAMEORIGIN response headers and successful phone/RTL browser checks in HANDOVER Part 63. Independent `curl -I` during this review failed DNS resolution, so header freshness was not independently confirmed. Do not attempt an iframe workaround or proxy on that basis.

## Verification evidence and limits

- Before edits: TypeScript check passed; full ESLint passed; 2,147 onboarding checks passed, 44 lessons.
- After corrections: TypeScript check, full ESLint and `git diff --check` passed; 2,145 onboarding checks passed, 44 lessons. The reduction of two checks follows removal of the address task from EN and AR, not removed test assertions.
- Node emits the existing MODULE_TYPELESS_PACKAGE_JSON warning. It is not a failing test; do not add `type: module` casually because that changes repository-wide module behavior.
- F1 reproduced with actual storage module and fake browser storage; no live data mutations.
- Production build: attempted but remained at "Creating an optimized production build" without further output over repeated checks; Jack interrupted it (exit 1 from interruption). Build is UNVERIFIED, not a demonstrated compilation failure. Network DNS also failed independently; the app uses next/font/google, but the cause of the stall is not established. Mark must rerun the build in a working environment. Final practice cleanup also passed targeted ESLint.
- No fresh visual/signed-in browser run by Jack. Mark's reported browser results are prior evidence, not independently repeated results. Jack's revised Arabic needs visual/native-language review. Actual CambriLearn authentication, installed-PWA handoff and mobile browser tab switching remain unverified.
- No commit, push, merge or deployment performed. Code corrections and this report are local and reviewable.

## Mark's acceptance checks

1. Review all Jack changes in `git diff`, including Arabic. Fix F1 and add the meaningful regression cases above.
2. Run `npm run typecheck`, `npm run test:onboarding`, `npm run lint`, `npm run build`, and `git diff --check`; fix failures and record outcomes.
3. Teacher and student: from /cambrilearn, check direct navigation, sidebar active state, launch destination/new tab, and return to the school app. Use controlled fixtures only. Parent: no menu item and direct URL denied. Signed-out: login gate. Do not bypass security gates to claim authenticated verification.
4. Onboarding: v10 finished users get one CambriLearn lesson; open action completes 1/1 without a new tab; pause/reload/finish/return work. Unfinished users retain progress. Parent behavior stays unchanged.
5. EN/AR, light/dark, 320/390/430 px and desktop: no horizontal overflow; static address remains LTR; revised Arabic wraps; keyboard focus reaches the real link and practice action; new-tab announcement remains available. Check installed PWA/mobile handoff if supported.
6. Return the final commit, test output summary and unresolved limitations. Preserve the previous waiver of a signed-in admin onboarding walkthrough; this report does not request that waived walkthrough again.

## Nonblocking improvements

- Add page-specific metadata so the school tab can be identified as CambriLearn when switching back from the external portal.
- Use neutral launcher copy for staff instead of promising "your lessons and work" for every role; the feature map itself says portal contents are unverified.
- Consider a short shared-device reminder: school-app sign-out does not sign out CambriLearn, and vice versa. Keep credentials and session management on the provider's own site.
- Avoid expanding scope into an availability probe, proxy, embedded login or SSO without a separate provider-supported design.
