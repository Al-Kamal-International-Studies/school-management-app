-- ============================================================================
-- Security hardening, batch 1: make deactivation/archiving actually take
-- away database-level access, and stop audit logs from being self-forgeable.
--
-- Finding F3 (docs/SECURITY.md): auth_role()/is_admin() — used at 57 policy
-- sites across every migration in this schema — only ever checked `role`,
-- never `is_active`/`archived_at`. requireRole() (src/lib/auth.ts) blocks
-- page navigation for a deactivated account, but that's an app-layer gate;
-- the account's still-valid session retained full role-based RLS access
-- until its JWT naturally expired. Redefining these two functions (via
-- `create or replace function`, not touching a single policy statement)
-- fixes every call site at once.
--
-- Finding F7: the "users can log their own actions" policy on audit_logs
-- let any authenticated user insert a log row attributed to themselves via
-- a direct API call — fine for who it's attributed to (auth.uid() can't be
-- spoofed), but a security log shouldn't be client-writable at all. Audit
-- writes now go exclusively through the service-role client (see
-- src/lib/audit/log.ts, updated alongside this migration), which bypasses
-- RLS entirely, so no authenticated-role policy is needed for INSERT at all.
-- ============================================================================

create or replace function public.auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and is_active = true and archived_at is null;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() and is_active = true and archived_at is null) = 'admin',
    false
  );
$$;

-- Audit logs: remove the authenticated-insert policy. No replacement policy
-- is added for `authenticated` — writes now only happen via the service-role
-- client, which bypasses RLS. This makes the log tamper-resistant against
-- anyone using their own app session, admins included.
drop policy if exists "users can log their own actions" on audit_logs;
