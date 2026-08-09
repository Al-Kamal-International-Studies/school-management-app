-- ============================================================================
-- Security hardening, batch 3: a minimal Postgres-backed rate limiter.
-- No third-party service (Upstash/Redis/etc.) — consistent with this
-- project's established "free/self-hosted over new accounts" convention
-- (see HANDOVER_2 §21 on Web Push/VAPID and CSV export for the same
-- reasoning). RLS is enabled with zero policies for authenticated/anon, so
-- only the service-role client (see src/lib/security/rateLimit.ts) can ever
-- read or write this table — deny-by-default, same pattern as audit_logs
-- and the documents bucket.
-- ============================================================================

create table rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  created_at timestamptz not null default now()
);

create index idx_rate_limit_bucket_created on rate_limit_events(bucket, created_at desc);

alter table rate_limit_events enable row level security;
-- No policies added on purpose — deny-by-default for authenticated/anon.

-- Lets old rows be reclaimed by any scheduled cleanup (Supabase's free-tier
-- Cron/Edge Functions, or a manual periodic run) — not scheduled
-- automatically by this migration, just makes the housekeeping query cheap.
create index idx_rate_limit_created_at on rate_limit_events(created_at);
