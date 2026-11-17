# CambriLearn review — Jack to Mark

## Same-window review — 17 November 2026, `d8c83c2`

**Verdict: the link change is sound for the chosen same-window fallback; release acceptance remains pending installed-device evidence and a complete build.** This is a new behavior change after the earlier approved release (`2e8b87f`). Earlier approval does not certify this change's installed-app behavior. Jack corrected the two wording issues below locally; Mark must review and commit those corrections.

### Findings

**SW1 — P2, corrected locally: unconditional installed-window promise.** `cambrilearnText.ts`, the practice toast and FEATURE_MAP asserted that the portal stays inside the installed app's window. The code only removes the new-window target from an ordinary external link. It adds neither an internal tab manager nor a controlled browser view. The installed browser decides how to present an out-of-scope origin. Official web.dev guidance supports the intended in-app-browser approach, but neither Mark nor Jack has tested the actual installed device on this branch. The three source checks cannot establish that outcome. Jack replaced categorical claims with accurate browser-versus-installed-app wording in English and Arabic and corrected the test comment. Link behavior itself remains as Mark implemented it.

**SW2 — P2, corrected locally: ambiguous close-button instruction.** The page, lesson and practice all told users to use the close button at the top of the screen. In a normal same-tab browser, that can close the only Al Kamal tab/window instead of returning. Mobile Back controls are not necessarily at the top either. Jack changed all EN/AR copies to use Back, dismiss only a separate portal view if one opens, and reopen Al Kamal if needed. This avoids instructing everyone to close the containing window. Verify the longer Arabic copy at narrow widths.

**SW3 — acceptance gap, OPEN: the requested installed-app result has not been demonstrated.** Mark explicitly reports no actual installed-phone/desktop check. Dev preview deliberately does not navigate, so it cannot validate the fix to the user's complaint. Keep this open until an installed build is tested on the device/browser where the original unwanted browser handoff occurred. Do not mark it verified from source inspection or responsive desktop emulation.

### What is correct

- The anchor has the fixed HTTPS CambriLearn URL, no new-window target, and `rel="noreferrer"`. Normal primary activation requests navigation in the current browsing context. No script popup, iframe, credential proxy, manifest change or authentication change.
- Parent exclusion and existing security gates are unchanged. The migration/run-isolation fixes from `9acac47` are retained. No new database or environment requirements.
- Both language dictionaries rename the screen-reader notice consistently to `leavesApp`; the real destination remains disclosed. Practice stays simulated and completes the existing `open-portal` task.
- `public/manifest.json` is still standalone with scope `/` on Al Kamal's own origin. CambriLearn is a different origin. `public/sw.js` ignores cross-origin requests; it does not keep the provider inside the app or inspect its credentials.
- The selected fallback is same-window navigation. It does not create the user's originally requested independent internal tab, retain a visible school sidebar over CambriLearn, or make CambriLearn part of Al Kamal's origin.

### Evidence and checks

- Independent typecheck, full lint and 2,185 onboarding checks passed during this review. After Jack's edits, the onboarding suite again passed 2,185/2,185 and typechecking passed.
- `git diff --check` passed. Working tree was clean at review start. Jack's changes are wording/documentation/test-comment edits only, not navigation changes.
- No new production build attempted in this round: Mark already reports two full builds failing at page generation from memory exhaustion after successful compilation, and Jack's earlier build attempts stalled. A compile message alone is not a complete build. Obtain a successful full build on the final committed change in a suitable environment; retain the log. The earlier successful deployed `2e8b87f` build does not validate this branch.
- No fresh browser/device/signed-in run by Jack. Mark reports dev-preview English/Arabic and 390px checks before Jack's copy corrections. These are not installed-PWA evidence. No production data touched, no commit/push/deployment by Jack.
- Sources consulted on 17 November: [web.dev Window management, Browse other sites](https://web.dev/learn/pwa/windows#browse_other_sites) describes out-of-scope in-app browsing and its return controls; [W3C Web Application Manifest](https://www.w3.org/TR/appmanifest/#navigation-scope) defines navigation scope (working draft). The web.dev page also limits its `_blank` external-browser statement to desktop PWAs, so do not retain a blanket claim that every installed mobile app necessarily sends `_blank` to the system browser. Documentation is supporting design evidence, not a device test.

### Mark's exact next step

1. Review Jack's local EN/AR copy changes, FEATURE_MAP correction and test-comment correction; fix anything you find, then commit them with attribution.
2. On the original affected installed device, record OS/browser versions and installation mode. Open the real launcher, activate Open CambriLearn, record whether the external browser opens or an in-app view appears, then return to Al Kamal. Confirm school navigation/session and onboarding progress remain usable. If testing provider login/redirects, use an authorized test account; never put credentials in the report.
3. Check a normal browser's same-tab behavior and Back; installed Chrome/Edge desktop, Android and iOS only to the extent these are claimed supported. Record unsupported/untested platforms explicitly. Do not demand another signed-in admin onboarding walkthrough; that waiver remains.
4. Check updated Arabic/English at 320/390/430 px, light/dark and keyboard activation. Obtain a complete successful final build and rerun checks after any further fixes.
5. Return the final commit and device/build evidence for release acceptance. If the original device still hands off to the browser, this has not solved the reported problem: report the observed limitation before deploying. Do not bypass CambriLearn's framing policy or introduce a proxy.

**Message for Mark:** Jack has completed the same-window review. The navigation implementation is acceptable for the chosen fallback, and Jack corrected overpromising/return wording locally. Review those edits, fix any resulting failures, and immediately complete the real installed-device and full-build verification. Deployment approval remains pending that evidence; no new feature redesign is requested.

---

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
