# School Management App — Phase 1 (Foundation / MVP)

Role-based web app for Admin, Teacher, and Student users, built with
**Next.js (App Router) + Supabase** (Postgres, Auth, RLS).

This is Phase 1 of the roadmap in `School_Management_App_Specification.md`:

- ✅ Authentication (email/password, forgot-password, role-based dashboards)
- ✅ User management (Admin creates/edits/deactivates Teacher & Student accounts)
- ✅ Class & subject management, teacher-subject-class assignment
- ✅ Weekly timetable (Admin builds it; Teacher/Student view theirs)
- ⏭️ Attendance, gradebook, assignments, announcements, fees, reports — later phases

Self-registration is intentionally disabled — accounts are created by an Admin only, per spec.

---

## 1. Prerequisites

Node.js (v24 LTS) is already installed on this machine and `npm install` has already been run — the app currently builds and type-checks cleanly (`npm run typecheck`, `npm run lint`, and `npm run build` all pass as of this writing). The one thing still needed:

- A **Supabase project** (free tier is fine) — https://supabase.com → New Project.

On a different machine: install Node.js first (https://nodejs.org, or `winget install OpenJS.NodeJS.LTS` on Windows), then run `npm install` from this folder.

---

## 2. Set up the database

1. In your Supabase project dashboard, open **SQL Editor**.
2. Run `supabase/migrations/0001_schema.sql`, then `supabase/migrations/0002_rls_policies.sql`, in that order.
3. Optionally run `supabase/seed.sql` to add a starter subject list.

(If you have the Supabase CLI installed and linked instead, `supabase db push` will apply everything in `supabase/migrations` for you.)

---

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the values from **Project Settings → API** in the Supabase dashboard:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — **secret**, server-only, never commit it |

`NEXT_PUBLIC_SITE_URL` can stay as `http://localhost:3000` for local dev.

Also add `http://localhost:3000/reset-password` to **Authentication → URL Configuration → Redirect URLs** in Supabase, so password-reset links work.

---

## 4. Create the first Admin account

Accounts are admin-created only, so bootstrap the first one from the command line:

```bash
npm run create-admin -- --email=you@school.org --password="ChangeMe123!" --name="Jane Principal"
```

---

## 5. Run it

```bash
npm run dev
```

Open http://localhost:3000, sign in with the admin account you just created, and:

1. **Admin → Subjects**: add subjects (or use the seeded list).
2. **Admin → Users**: add a teacher, then a student.
3. **Admin → Classes**: create a class, assign the teacher to a subject for it.
4. **Admin → Timetable**: pick the class and add periods.
5. Sign in as the teacher or student (or open an incognito window) to see their dashboard and timetable.

---

## Project structure

```
src/
  app/
    login/, forgot-password/, reset-password/   — auth pages
    (dashboard)/
      admin/     — overview, users, classes, subjects, timetable
      teacher/   — my classes, today's schedule, my timetable
      student/   — dashboard, my timetable
  components/
    ui/          — Button, Input/Select, Card, Table, Badge, Alert
    nav/         — Sidebar, Topbar
    timetable/   — shared weekly schedule grid
  lib/
    supabase/    — browser / server / admin (service-role) clients
    auth.ts      — getCurrentProfile(), requireRole() route guards
    types/       — database.types.ts (hand-written, matches the SQL schema)
  proxy.ts       — refreshes the Supabase session, redirects unauthenticated users (Next.js's middleware convention, renamed to "proxy" in v16)
supabase/
  migrations/    — schema + Row Level Security policies
  seed.sql       — optional starter subjects
scripts/
  create-admin.mjs — bootstraps the first Admin account
```

## Security notes

- **RLS is enabled on every table** — even if a role check in the UI or a layout were ever missed, the database itself refuses cross-role access. Writes to `profiles`/`classes`/`subjects`/etc. are admin-only at the database level, not just hidden in the UI.
- Teacher/Student account creation goes through the `service_role` key **only** inside Server Actions (`src/app/(dashboard)/admin/users/actions.ts`) — that key is never sent to the browser.
- Passwords are hashed by Supabase Auth (bcrypt under the hood); this app never stores or sees raw passwords beyond the initial admin-set temporary password submission.

## What's next (Phase 2+, not built yet)

Attendance, gradebook/exams, assignments & submissions, announcements/notifications, fee management, and the admin analytics dashboard — see `School_Management_App_Specification.md` for the full roadmap. The schema and folder structure here were designed so those modules slot in without a rebuild (e.g. `enrollments` already tracks student↔class history for attendance/report cards to key off later).
