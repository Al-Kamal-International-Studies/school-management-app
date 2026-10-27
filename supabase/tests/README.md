# Row Level Security regression tests

These load **every migration in `supabase/migrations/`** into an in-process Postgres (PGlite — no Docker, no Supabase
account, nothing touches your real database) behind a minimal Supabase shim, then act as each role the way PostgREST
does (`SET ROLE authenticated` + the user's id) and check what each can read and write.

They were written for migration `0043_audit_hardening.sql` (HANDOVER.md Part 33). Each suite first loads migrations
`0001–0042` and proves the original bug reproduces, then applies `0043` and proves it is fixed — and that the
legitimate paths (a teacher grading, a parent reading their child, a principal seeing both centers…) still work.

```bash
npm install --no-save @electric-sql/pglite   # test-only; deliberately not a project dependency
node supabase/tests/rls-0043.test.mjs        # 67 checks
node supabase/tests/rls-admissions.test.mjs  # 9 checks
```

Add a suite here whenever a migration changes a policy. `load.mjs` also prints any migration that fails to load, which
catches SQL typos before they reach the Supabase SQL Editor.
