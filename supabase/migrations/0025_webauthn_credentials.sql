-- ============================================================================
-- Biometric sign-in (Face ID / fingerprint / Windows Hello) via WebAuthn.
-- Stores one row per registered platform authenticator. The actual
-- attestation/assertion signature verification happens in application code
-- via @simplewebauthn/server — this project's own rule against hand-rolled
-- cryptography (docs/SECURITY.md §0) rules out reimplementing that by hand.
--
-- RLS: same shape as user_devices — a user manages their own rows through
-- the regular client for registration/removal. The one exception is the
-- *login* ceremony itself, which necessarily runs before a session exists
-- (that's the entire point of "sign in with biometrics") — that lookup
-- goes through the service-role client
-- (src/app/login/webauthnActions.ts), same pattern as
-- password_reset_requests/rate_limit_events.
-- ============================================================================

create table webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean not null default false,
  transports text[],
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index idx_webauthn_credentials_user on webauthn_credentials(user_id);

alter table webauthn_credentials enable row level security;

create policy "users can view their own webauthn credentials"
  on webauthn_credentials for select to authenticated using (user_id = auth.uid());

create policy "users can register their own webauthn credentials"
  on webauthn_credentials for insert to authenticated with check (user_id = auth.uid());

create policy "users can remove their own webauthn credentials"
  on webauthn_credentials for delete to authenticated using (user_id = auth.uid());

-- No update policy for authenticated — the counter is only ever bumped
-- during the login ceremony (no session yet), so that write goes through
-- the service-role client, same as the row lookup for that same ceremony.
