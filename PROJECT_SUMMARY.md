# Al Kamal International Studies — School Management App
### Simplified Project Summary

*Generated 2026-09-15*

---

## 1. What This Is

A full role-based school management system built for **Al Kamal International Studies** (AKIS) and its sister center (AKET). It covers Admin, Teacher, Student, and Parent roles, each with their own dashboard, plus a public admissions flow. It's a real, live production app — not a prototype — currently deployed and in active use.

## 2. How It Was Built

The entire app was built through AI-assisted development with **Claude Code**, working directly with Muhammad (Director, Al Kamal International Studies) across many sessions since **August 2026**. There was no separate design/dev team — each feature was scoped, built, tested, and documented in the same sitting, then deployed straight to production.

The project keeps a single running handover document (`HANDOVER.md`, outside this repo) that logs *every* decision, feature, and bug fix in detail — currently at **23+ "Parts"** covering everything from the original MVP to multi-center support, admissions, ID cards, and native mobile apps. This is an unusually disciplined paper trail for a project this size.

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router), React 19, TypeScript (strict mode) |
| Styling | Tailwind CSS v3, Framer Motion for animation |
| Database / Backend | **Supabase** (hosted Postgres + Auth + Storage), secured with Row Level Security (RLS) on every table |
| Validation | Zod (all Server Action inputs validated) |
| Auth | Supabase Auth (email/password) + **WebAuthn** (Face ID / fingerprint / Windows Hello passkeys) + MFA + account lockout + device cap |
| Mobile | **Capacitor**, wrapping the app for native Android & iOS builds (App Store / Play Store-ready), with native push notifications |
| Offline support | Service worker + cached dashboards, so core screens still work without a connection |
| PDF/Documents | `pdf-lib` and `mupdf` for generating ID cards and admission PDFs |
| i18n | Full English + Arabic coverage across the entire app |
| Hosting / CI-CD | Vercel (auto-deploys from `main`), GitHub for version control |

## 4. Database

- **Supabase Postgres**, fully relational, with Row Level Security enforced at the database level (not just hidden in the UI) — even a missed role-check in the UI can't leak cross-role data.
- **42 migrations** applied to date, totaling roughly **3,150 lines of SQL** (schema + RLS policies).
- Core tables cover: user profiles/roles, classes & subjects, enrollments, timetables, attendance/grades groundwork, messaging & class chat, documents, audit logs, admissions (including an autism-support intake workflow), multi-center (AKIS/AKET) data separation, notifications, and native push tokens.

## 5. Lines of Code

| Scope | Amount |
|---|---|
| Application source (`src/`) — TypeScript/TSX/CSS | **~29,000 lines** across **340 files** (210 `.tsx` component/page files, 129 `.ts` logic files) |
| Database (SQL migrations) | **~3,150 lines** |
| **Combined hand-written total** | **~32,000 lines** |

*(This excludes `node_modules` and the native `android/`/`ios/` Capacitor scaffolding, which are generated/vendor code, not hand-written.)*

## 6. Major Features

- **Role-based dashboards** for Admin, Teacher, Student, and Parent, each with real, live data.
- **Timetable builder** — admins and teachers can build weekly class schedules.
- **Messaging & Class Chat** — direct messages plus subject-level group chat (Google Classroom-style).
- **Bilingual chatbot** (English + Arabic) for user help.
- **Admissions system** — public intake form, including a dedicated Autism Section workflow, PDF generation, and automatic account/roster creation.
- **ID cards** — generated on demand (never stored), downloadable as PDF or image, for every role.
- **Document center** with audit logging.
- **Notifications** — both a push-notification system (web + native mobile) and an in-app notification bell.
- **Guided onboarding tour**, versioned so returning users only see what's new.
- **Multi-center support** — AKIS and AKET run in the same app with a center switcher and data isolation.
- **Security hardening** — MFA, WebAuthn passkeys, device-limit enforcement ("remember me" capped at 3 devices), account lockout after repeated failures, forced password change on first login, full audit trail.
- **Installable app** — originally a PWA, later wrapped natively with Capacitor for real Android/iOS app store distribution, including offline caching and native push.
- **Full Arabic/English localization**, including in the chatbot and guided tour.

## 7. Status

Live in production, actively maintained, with CI/CD via Vercel and dependency vulnerabilities kept at zero (Dependabot). Real onboarding data (staff and students) has been loaded, and multiple rounds of live bug fixes have been shipped based on Muhammad's own hands-on testing.

---

*For the complete, no-detail-omitted history — every decision, root-cause writeup, and bug fix — see the authoritative handover document at `E:\Coding Projects\Claude\HANDOVER.md`.*
