-- ============================================================================
-- Account security columns, batch 1: two new self-defense flags on profiles.
--
-- failed_login_attempts: incremented by loginAction on each failed password
-- attempt (looked up by email via the service-role client, since no session
-- exists yet at that point). At 3, the account is deactivated + banned at
-- the Auth level (same mechanism as the existing archive/deactivate flow —
-- see src/lib/auth/accountAccess.ts's setAccountBanned()) until an admin
-- reactivates it, which also resets this counter back to 0. This is a new,
-- permanent-until-fixed lockout, distinct from and in addition to the
-- existing rate_limit_events-backed limiter (0018_rate_limiting.sql), which
-- only slows down guessing for 15 minutes — this one actually locks the
-- account.
--
-- must_change_password: set whenever an admin hands someone a password they
-- didn't choose themselves (new-account creation, or an admin manually
-- resetting an existing account's password) — requireRole() redirects to
-- /force-password-change until it's cleared.
-- ============================================================================

alter table profiles add column if not exists failed_login_attempts int not null default 0;
alter table profiles add column if not exists must_change_password boolean not null default false;

-- ----------------------------------------------------------------------------
-- Extends the F1 fix (0017_close_bopla_gaps.sql) to these two new columns —
-- same exact gap class the security audit found and closed there: a
-- "you can update your own row" policy that doesn't also restrict which
-- columns a non-admin can change. Without this, a user could directly
-- `PATCH` their own profile to clear must_change_password (skip the forced
-- reset entirely) or reset failed_login_attempts, bypassing both features
-- via a direct API call the same way F1 originally let someone self-grant
-- admin. Pinned here for both columns, alongside every column 0017 already
-- pinned (repeated in full since `create policy` replaces the whole
-- definition, not just the new lines).
--
-- The one legitimate case a user needs to flip must_change_password
-- themselves — actually completing the forced change at
-- /force-password-change — goes through the service-role client instead
-- (src/app/force-password-change/actions.ts), same pattern already used
-- elsewhere in this app for privileged self-service writes (e.g.
-- setAccountBanned), not through this RLS-scoped path at all.
-- ----------------------------------------------------------------------------
drop policy "users can update their own profile" on profiles;

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid() or is_admin())
  with check (
    is_admin()
    or (
      id = auth.uid()
      and role is not distinct from (select p.role from profiles p where p.id = auth.uid())
      and is_active is not distinct from (select p.is_active from profiles p where p.id = auth.uid())
      and archived_at is not distinct from (select p.archived_at from profiles p where p.id = auth.uid())
      and archived_by is not distinct from (select p.archived_by from profiles p where p.id = auth.uid())
      and title is not distinct from (select p.title from profiles p where p.id = auth.uid())
      and email is not distinct from (select p.email from profiles p where p.id = auth.uid())
      and date_of_birth is not distinct from (select p.date_of_birth from profiles p where p.id = auth.uid())
      and failed_login_attempts is not distinct from (select p.failed_login_attempts from profiles p where p.id = auth.uid())
      and must_change_password is not distinct from (select p.must_change_password from profiles p where p.id = auth.uid())
    )
  );
