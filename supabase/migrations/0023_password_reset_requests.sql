-- ============================================================================
-- Replaces the email-link "forgot password" flow with an admin-mediated one,
-- per the user's spec: /forgot-password no longer sends a Supabase reset
-- email at all — it lets a (necessarily unauthenticated) visitor flag "I
-- need my password reset," and an admin handles it manually from
-- /admin/password-reset-requests (sets a new password directly — see
-- adminSetUserPasswordAction).
--
-- RLS: same shape as audit_logs (0011_operations.sql/0016_authz_hardening.sql)
-- — admins can read/resolve via the regular client, but there is
-- deliberately no INSERT policy for authenticated/anon at all. The
-- submitter isn't authenticated when a row is created (that's the entire
-- premise of "forgot password"), so creation only ever happens through the
-- service-role client (src/app/forgot-password/actions.ts) — a user can
-- never forge or self-resolve a request via a direct API call.
-- ============================================================================

create table password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null
);

create index idx_password_reset_requests_status on password_reset_requests(status, created_at desc);

alter table password_reset_requests enable row level security;

create policy "admins can view password reset requests"
  on password_reset_requests for select to authenticated using (is_admin());

create policy "admins can resolve password reset requests"
  on password_reset_requests for update to authenticated using (is_admin()) with check (is_admin());

-- No insert/delete policy for authenticated/anon on purpose — see banner comment above.
