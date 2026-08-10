-- ============================================================================
-- Device tracking for the "max 3 devices, remove one to add a new one"
-- requirement. The installed Supabase Auth SDK has no session-enumeration
-- or per-session-by-id revoke API (checked directly against
-- node_modules/@supabase/auth-js's types, same finding already documented
-- in src/lib/auth/accountAccess.ts's doc comment for the same reason) — so
-- this is the app's own device ledger, populated at login time
-- (src/app/login/actions.ts) and consulted on every request
-- (requireRole() in src/lib/auth.ts).
--
-- RLS: a user manages their own rows directly through the regular client
-- (unlike password_reset_requests/rate_limit_events, there's no reason to
-- route this through service-role — nothing here is more privileged than
-- "which of MY devices are registered").
-- ============================================================================

create table user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  device_id uuid not null,
  label text,
  user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index idx_user_devices_user on user_devices(user_id);

alter table user_devices enable row level security;

create policy "users can view their own devices"
  on user_devices for select to authenticated using (user_id = auth.uid());

create policy "users can register their own devices"
  on user_devices for insert to authenticated with check (user_id = auth.uid());

create policy "users can update their own devices"
  on user_devices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users can remove their own devices"
  on user_devices for delete to authenticated using (user_id = auth.uid());
