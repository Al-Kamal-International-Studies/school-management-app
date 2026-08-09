# Security Hardening — Al Kamal International Studies School App

**Status:** Living document, Phase 1 in progress.
**Started:** 2026-08-10. **Owner:** whoever is driving development (currently Claude, at Muhammad's direction).
**Input:** a 16-section security checklist + test plan supplied by "the programming team." This document is the filtered, evidence-based response to it — what applies to *this* app, what doesn't, what was already correct, what was actually broken, and the order it's being fixed in.

---

## 0. Ground truth this filter is based on

Before filtering a generic checklist against a real app, the checklist's assumptions were checked against the actual code — not taken on faith. Key facts that shape every decision below:

- **This is a PWA, not a compiled native app.** No iOS/Android binary exists or is planned via this codebase (Part 1 HANDOVER, §3, §12 — deliberate choice). Every checklist item about Keychain/Keystore, ATS/pinning, jailbreak/root detection, binary obfuscation, and decompilation targets a binary that doesn't exist here. The *equivalent* web risk (don't put secrets in client-reachable storage) does apply and was checked directly.
- **No Google Sheets / email integration exists.** Feedback is confirmed in-app-only storage (HANDOVER_2 §8, §13.1). The checklist's §15 concerns are theoretical for this app today.
- **Not deployed anywhere yet.** No host, no domain, no CI/CD (both handovers, §16/§19). Transport-layer production hardening (HSTS, CORS origin allowlists, cert config) can't meaningfully be finished until a host is chosen — noted as Phase 3, tied to the deployment conversation Muhammad said he'll start separately.
- **No git repository existed before this pass.** `git status` returned "not a git repository." This blocks essentially all of checklist §12/§16's supply-chain items (secret scanning, SCA in CI, protected release branches) at the root. Fixed first (Phase 0) so every change from here on is reviewable and revertible.
- **The app already has a real authorization backbone.** Every protected route calls `requireRole()` (49 files use it); every Server Action re-validates the role server-side; RLS is enabled on all 28 application tables with a consistent `is_admin()`/ownership-via-`class_subject_teachers` pattern. This is *not* "frontend-only role protection" — the checklist's most-repeated warning does not describe this codebase's baseline. That said, auditing it found real gaps, detailed in §2.

---

## 1. The checklist, filtered

| # | Section | Verdict | Why |
|---|---|---|---|
| 1 | Identity & access control | **Applies — mostly already in place, gaps fixed in Phase 1** | RBAC (admin/teacher/student/parent) exists and is enforced server-side + RLS. BOLA/BOPLA: found and fixing 2 real holes (§2). Admin functions are already separated. MFA: not built — **Phase 2**. Session/device management (list, manual revoke): not built — **Phase 2**. Forced logout on deactivate/role-change: **Phase 1 fix**. |
| 2 | Passwords & login | **Applies — fixing now** | No forced rotation/complexity rules already (correct, matches current NIST). Hashing is Supabase Auth's problem (bcrypt via GoTrue), not app code. Enumeration protection already correct on login + forgot-password. Gaps: 8-char minimum everywhere (want 12/15), no breach-list screening, no rate limiting, reset doesn't force-revoke other sessions. **Phase 1.** |
| 3 | Session & token security | **Applies, adapted — mostly already correct** | Tokens live in httpOnly cookies via `@supabase/ssr` (server.ts/client.ts), never `localStorage` — confirmed by reading both client files, not assumed. Access-token expiry/refresh rotation is a Supabase project setting (needs a dashboard check, not app code — see §5). Server-side revocation: **Phase 1 fix**. Device fingerprint/risk scoring for admin sessions: **Phase 2+, low priority** for a single-school app with 2 admin accounts. |
| 4 | Mobile app storage security | **Not applicable as written; web-equivalent already correct** | No OS-level app sandbox exists to secure — this is a browser tab. The real equivalent (no tokens/secrets in `localStorage`, sessionStorage, or logs) was checked directly and holds. Service worker deliberately doesn't cache HTML or API responses (Part 1 §12) so there's no "cached sensitive data" surface to clear on logout. Screen-capture blocking, root/jailbreak checks: not meaningful for a web page. |
| 5 | Data encryption & cryptography | **Mostly platform-handled / N-A** | No hand-rolled crypto anywhere in the codebase (confirmed — VAPID keys are standard-generated via the `web-push` library, nothing else crypto-shaped exists). No MD5/SHA-1 usage found. TLS is Supabase's problem today and the host's problem at deployment (**Phase 3**). Encrypting specific columns (DOB, phone) at the application layer beyond Postgres's at-rest encryption is a real engineering undertaking (key management, breaks searchability) that isn't proportionate for a free-tier single-school deployment right now — flagged as a conscious deferral, not a silent skip, revisit if the data sensitivity profile changes. |
| 6 | Transport & network security | **Mostly N/A until hosting is chosen** | HTTPS enforcement, HSTS, CORS allowlists are meaningless against `localhost`. Certificate pinning is a native-app concept with no analog here — browsers already do CA validation; nothing in this codebase does custom TLS handling that could bypass it (checked — no custom `fetch`/https-agent code exists). **Revisit as Phase 3, at deployment.** |
| 7 | API security | **Applies strongly — this is the real attack surface, and the audit found real bugs here** | "API" in this app = Supabase's auto-generated PostgREST + Next Server Actions, not a hand-rolled REST layer, so it's mapped to OWASP API Top 10 concretely in §2. This is where the two critical findings live. |
| 8 | Input validation & output handling | **Applies — mostly already correct, verifying the rest** | Every Server Action validates with Zod before touching the DB (consistent pattern, confirmed across every action file read). No `dangerouslySetInnerHTML` found in a codebase-wide grep. File upload validation (avatar/document types+size) needs a direct check — **Phase 1/2**. No third-party data ingestion (CSV import, Sheets, external APIs) exists yet, so that sub-item is N/A today. |
| 9 | Admin-panel hardening | **Applies — partially done, gaps identified** | Admin routes/actions are already separated and role-gated. Web UI **cannot** create an admin account at all (the `createUserSchema` enum is `["teacher","student","parent"]` only — verified in code) — only the CLI bootstrap script can, and that requires filesystem/server access. Hard delete is already gone (soft-delete/archive only, per HANDOVER_2 §12, confirmed in code). Gaps: admin MFA (**Phase 2**), dual-control/approval for destructive actions (flagged for a product conversation, not built silently — see §6, this app currently has 2 admin accounts total, so "dual control" needs Muhammad's input on whether that's even practical), audit log coverage (**Phase 1 fix**). |
| 10 | Privacy & data minimization | **Applies, mostly a documentation exercise** | Data classification + retention rules are written into the matrix (§3) rather than new code. No analytics/crash-reporting SDK exists in this app (checked `package.json` — nothing third-party beyond Supabase/web-push), so "third-party SDK exfiltration" is N/A today. |
| 11 | Logging, monitoring, alerting | **Partially applies now, rest is Phase 2+** | Structured logging of security events (login failures, deactivations) needs a destination to be useful — there's no email/Slack/PagerDuty configured, and standing up one is a product decision (a new account/service), not silently added. Phase 1 expands what's captured *in the database* (audit_logs). Actual alerting (something pages a human) is **Phase 2+**, dependent on Muhammad choosing where alerts should go. |
| 12 | Secure coding & supply chain | **Blocked on git existing at all — now unblocked** | No repo existed. Fixed in Phase 0. Dependency review: `package.json` has 8 runtime deps total, all mainstream (`@supabase/*`, `next`, `react`, `framer-motion`, `lucide-react`, `zod`, `web-push`) — no SCA tooling wired up yet since there's no CI/CD to run it in (**Phase 4, once hosting/CI exists**). |
| 13 | Configuration & infrastructure | **Partially applies now, rest is deployment-dependent** | No debug/test credentials found hardcoded in app code (checked — the seeded test accounts live only in the handover docs and Supabase itself, not in source). Security headers/CORS: **Phase 1 fix** (headers) + **Phase 3** (CORS origins, once a real domain exists). Cloud IAM/least-privilege, environment segmentation: N/A — there's one Supabase project and no cloud infra yet. |
| 14 | Binary & runtime protections | **Not applicable** | No binary. No app store submission planned via this codebase (PWA, per explicit prior decision). Nothing to obfuscate, sign, or root-detect. |
| 15 | Secure integrations (Sheets/email) | **Not applicable today** | Confirmed no such integration exists (HANDOVER_2 §8, §13.1: feedback is in-app-only, explicitly *not* synced anywhere). Revisit this section from scratch if/when such an integration is actually built. |
| 16 | Secure SDLC controls | **Applies going forward, gated on infra that doesn't exist yet** | Threat-modeling and security acceptance criteria are being applied to this feature set right now (this document *is* that). SAST/DAST/secret-scanning-in-CI need a CI pipeline, which needs a host/repo decision — **Phase 4**. |

**Net effect:** roughly half the original checklist (mobile binary protections, cert pinning/ATS, Sheets/integration security, most of the enterprise infra asks) doesn't describe this app and isn't being built as security theater. The other half is real, and where it's real, it's either already correct (verified, not assumed) or is being fixed now.

---

## 2. Concrete findings from this audit

Ranked by actual exploitability, with file references. These are not hypothetical — each was confirmed by reading the live policy/action code, not inferred from the handover's summary text (which in a couple of places turned out to be slightly optimistic about what RLS actually enforced).

### 🔴 CRITICAL — fixing first

**F1. Any authenticated user can promote themselves to admin via a direct API call.**
`supabase/migrations/0002_rls_policies.sql:49-53` — the "users can update their own profile" policy checks *row ownership* (`id = auth.uid()`) but not *which columns* changed. The Next.js Server Action (`profile/actions.ts`) only ever sends `full_name`/`phone`, so the UI never does this — but RLS, not the UI, is supposed to be the real boundary (Part 1 HANDOVER §8.1 says so explicitly). A student calling Supabase's REST API directly with their own valid session and `PATCH /profiles?id=eq.<self> {"role":"admin"}` would currently succeed. Same hole exposes `is_active`, `archived_at`, `title`, `email`, `date_of_birth` to self-tampering.
**Fix:** migration pinning those columns to their existing stored value for the non-admin branch of the policy (Phase 1, task in progress).

**F2. A student can forge their own assignment grade.**
`supabase/migrations/0010_academic_records.sql:203-204` — "students can update their own pending submission" checks `student_id = auth.uid()` only. `grade`, `feedback`, and `status` are not restricted, so a student can `PATCH` their own submission row directly to `{"status":"graded","grade":100,"feedback":"excellent"}`, bypassing the teacher entirely.
**Fix:** same technique — pin `grade`/`feedback` to unchanged, restrict `status` transitions available to the student.

### 🟠 HIGH

**F3. Deactivating/archiving an account doesn't revoke its live session.**
`is_admin()`/`auth_role()` (`0002_rls_policies.sql:12-30`) — used at 57 call sites across every RLS policy in the schema — check only `role`, never `is_active`/`archived_at`. `requireRole()` (`src/lib/auth.ts`) checks `is_active` for page navigation, but that's an app-layer gate; a deactivated admin's still-valid JWT retains full role-based database access via direct API calls until the token naturally expires, and the deactivate/archive Server Actions never call Supabase's session-revocation API. This is exactly the checklist's "token invalidation on role change or account disablement" item, and it isn't currently true.
**Fix:** helper functions become archived/inactive-aware (propagates to all 57 sites for free); deactivate/archive/role-change actions call `admin.auth.admin.signOut(userId, "global")`.

**F4. Five UPDATE policies re-check row ownership but not the foreign-key relationship that made the write legitimate in the first place.**
`grades`, `assignments`, `exams`, `attendance_records`, `monthly_progress_entries` — each has an INSERT policy that verifies the teacher actually teaches that class+subject (via `class_subject_teachers`), but the matching UPDATE policy only re-checks `teacher_id = auth.uid()`, not the class/subject/student relationship. A teacher could take a row they legitimately own and re-point its `student_id`/`class_id` to a student outside their assignment. Narrower than F1/F2 (needs an existing owned row, teacher-only, doesn't escalate privilege) but the same root cause.
**Fix:** mirror each INSERT policy's ownership `exists(...)` check into the corresponding UPDATE policy's `with check`.

### 🟡 MEDIUM

**F5. Password minimum is 8 characters everywhere; no breached-password screening.** Checklist wants 12 general / 15 admin, plus a compromised-password check. Currently identical (and weak) at every entry point: `admin/users/actions.ts`, `settings/actions.ts`, `reset-password/page.tsx` (client-side check only, easily bypassed by calling the Supabase client directly from devtools), `scripts/create-admin.mjs` (no check at all).

**F6. No rate limiting anywhere.** Login, password reset requests, feedback submission, and account creation have no attempt/frequency limits in application code. (Supabase Auth has its own platform-level rate limits on auth endpoints, but that's not configurable per-app and doesn't cover app-level flows like feedback spam.)

**F7. `audit_logs` can be forged by any user, for themselves.** `0011_operations.sql:85-86` allows any authenticated user to insert an audit log row with `actor_id = auth.uid()` — meaning a user could pollute their own audit trail with fabricated entries via a direct API call. The app's own `logAuditEvent()` helper relies on this policy today (uses the regular client, not the service-role client).

**F8. Audit logging covers 4 of ~20 admin-mutating action files.** Only `admin/users/actions.ts`, `admin/documents/actions.ts`, `admin/leave-requests/actions.ts` call `logAuditEvent()`. Announcements, events, classes, subjects, timetable, and feedback-status changes are currently unlogged.

**F9. No security headers.** `next.config.mjs` sets nothing beyond `reactStrictMode` — no CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`.

### 🟢 LOW (noted, not urgent)

**F10.** `feedback` INSERT policy lets a user set their own initial `status` (e.g. start pre-marked `resolved`) — cosmetic, doesn't expose or corrupt anyone else's data.
**F11.** `chatbot_conversations.persona` is editable post-creation by its owner — cosmetic.

### ✅ Verified already correct (no action needed)

- Service-role key usage confined to exactly one file (`src/lib/supabase/admin.ts`) — codebase-wide grep confirms it's never referenced anywhere else.
- Login and password-reset flows already avoid account-enumeration (generic error messages, `resetPasswordForEmail` always reports success).
- Tokens live in httpOnly cookies (`@supabase/ssr`), never `localStorage`/`sessionStorage`.
- Web UI has no path to create an admin account — `createUserSchema`'s role enum is `["teacher","student","parent"]` only.
- Hard delete doesn't exist in the app layer — archive-only, confirmed in `archiveUserAction`.
- The `documents` Storage bucket has zero `storage.objects` policies (deny-by-default), forcing all access through the signed-URL Server Action that checks the `documents` table's RLS first — correctly designed defense in depth.
- Teacher writes to grades/attendance/assignments/exams/remarks/behaviour/progress are ownership-checked against `class_subject_teachers` at *insert* time (the gap is update-time re-validation, F4).
- `.env.local` is gitignored; no secrets found hardcoded in source.

---

## 3. Security matrix (role × resource)

R = read, W = write/create, U = update, D = delete, — = no access. "Own" = row scoped to the acting user (or their linked child, for parent).

| Resource | Admin | Teacher | Student | Parent |
|---|---|---|---|---|
| profiles (own) | RWUD | RU (name/phone/avatar only — F1 fix) | RU (name/phone/avatar only — F1 fix) | RU (name/phone/avatar only — F1 fix) |
| profiles (others) | RWUD | R | R | R |
| classes / subjects / timetable | RWUD | R | R | R |
| grades / exams / assignments | R (all) | RWU (own classes only) | R (own) | R (linked child) |
| attendance / progress / remarks / behaviour | R (all) | RW (own classes only) | R (own) | R (linked child) |
| leave requests | RU (approve/reject) | R (own students) | RW (own, no self-update after submit) | RW (linked child) |
| documents | RWD | R (entitled) | R (entitled) | R (linked child's) |
| announcements / events | RWUD | R (matching audience) | R (matching audience) | R (`all`/`student` only — **parent can't be targeted, known gap, HANDOVER_2 §19**) |
| messages (dm) | RW (anyone) | RW (own students + those students' parents) | RW (own teachers only) | RW (linked child's teachers only) |
| feedback | R (all), U (status) | RW (own) | RW (own) | RW (own) |
| audit log | R | — | — | — |
| chatbot | — (intentionally excluded) | RW (own) | RW (own) | RW (own) |

**Destructive actions and their current gate:**

| Action | Who | Confirmation | Logged? | Reversible? |
|---|---|---|---|---|
| Archive ("delete") a user | Admin only | Type-to-confirm dialog | ✅ Yes | Yes (DB row survives) |
| Deactivate a user | Admin only | Button + role check | ✅ Yes | Yes |
| Delete a document | Admin only | — | ✅ Yes | No (file removed from storage) |
| Delete an announcement/event/class/subject | Admin only | — | ❌ No (F8) | Depends |
| True hard-delete of a person | Not exposed in-app at all | — | — | N/A by design |

---

## 4. Phased roadmap

**Phase 0 — Foundation (done this pass):** git init + baseline commit, this document.

**Phase 1 — Critical/high fixes (in progress this pass):** F1–F9 above: close the two BOPLA holes, fix session/role revocation, centralize password policy, add rate limiting to abuse-prone flows, add security headers, expand + lock down audit logging, sweep every Server Action for the same class of gap.

**Phase 2 — next pass, larger standalone features, not started:**
- Admin MFA (TOTP via Supabase Auth's native MFA API — enroll/challenge/recovery-codes UI, login flow gains a challenge step for admin accounts).
- Active-sessions list + manual "revoke this session" UI (self-service, Settings page).
- File upload validation pass (avatar + document type/size limits, both client and server side).
- Extend audit logging to teacher-side mutations (grades/attendance/progress edits), matching the checklist's explicit ask.
- Announcements/parent-audience gap (small migration + UI, flagged in HANDOVER_2 §19/§20, adjacent to this work but a product change, not a security fix).

**Phase 3 — deployment-time (blocked on Muhammad choosing a host, per his "I'll tell you when to start" on deployment):** HTTPS/HSTS enforcement, CORS origin allowlist for the real domain, production environment variables, Supabase Auth redirect URL updates, verify no debug output ships in the production build.

**Phase 4 — process/infra, needs a git remote + CI decision first:** dependency scanning (SCA) in CI, secret scanning in CI, SAST/DAST, branch protection, a documented vulnerability-response process.

**Not planned / explicitly out of scope unless the app's shape changes:** anything from checklist §4/§6(pinning)/§14/§F-tests (no native binary exists), §15 (no Sheets/email integration exists), field-level application encryption (disproportionate for the current data sensitivity + free tier — revisit if that changes), dual-control approval workflows (product decision for Muhammad — see §6 below, not something to build unasked with 2 total admin accounts).

---

## 5. Needs your action, not code

A few checklist wins are Supabase **dashboard** toggles, not application code — Claude doesn't have a Management API token for this project, so these need to be done directly in the dashboard (Project Settings → Authentication):

1. **Authentication → Policies → "Leaked password protection"** — a free, built-in HaveIBeenPwned check on every password set/changed. One toggle, zero code. Recommend turning this on regardless of the app-level blocklist Phase 1 is adding (defense in depth, and it's more complete than any local list).
2. **Authentication → Sessions → refresh token rotation / session timeout** — worth confirming these are on the values you want; the app-level fixes in Phase 1 (F3) revoke sessions on deactivation, but the *default* token lifetime is a project-level setting.
3. **Authentication → Rate Limits** — Supabase has its own platform-level limits on auth endpoints (separate from and in addition to the Phase 1 app-level limiter). Worth a quick look to confirm they're not set to something too loose.

None of these block Phase 1 code work — they're independent, and flagged here so they don't get lost.

---

## 6. Open questions for Muhammad (not decided unilaterally)

- **Dual-control/second-approver for destructive admin actions** — the checklist recommends this, but there are currently 2 total admin accounts. Worth asking whether that's even practical before building an approval workflow that might just add friction for one person approving their own colleague's action.
- **Where should security alerts actually go** (§11)? Repeated failed logins, mass record access, etc. need a destination — email, a dashboard, something else. Not choosing a new third-party alerting service without asking, consistent with the "no new paid/third-party accounts without approval" rule already established for this project (HANDOVER_2 §21).
- **MFA rollout** — Phase 2 will build admin TOTP MFA; will confirm scope (admin-only, or offered to everyone) before building the enrollment UI.

---

*This file is updated as each phase lands — treat it as the current source of truth for security status, not a one-time report.*
