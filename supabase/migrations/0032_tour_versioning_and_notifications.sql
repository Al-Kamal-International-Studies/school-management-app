-- ============================================================================
-- Two additions, bundled in one migration since they shipped together:
--
-- 1. tour_version_seen: makes the guided tour able to auto-show just the
--    NEW step(s) for a feature shipped after an account already completed
--    the tour, instead of either replaying the whole thing or (the old
--    behavior) never mentioning the new feature again. See
--    src/lib/tour/steps.ts's CURRENT_TOUR_VERSION doc comment for the full
--    mechanism and the standing rule (HANDOVER.md) that every new feature's
--    tour step must bump it. Defaults to 1 for every existing row — that's
--    accurate: every account that has already seen the tour only ever saw
--    version-1 content, so this correctly queues them for whatever shipped
--    after that (Class Chat, version 2, added the same day as this
--    migration) the next time they log in. New accounts get the full tour
--    on first login regardless of this column (has_seen_tour gates that
--    separately) and end up at the current version once they finish it.
--
-- 2. notifications: a real in-app notification inbox (the Topbar bell),
--    replacing "push notification or nothing" with "push notification AND
--    a persistent, clickable inbox entry." Rows are only ever inserted by
--    trusted server code via the service-role client (see
--    src/lib/notifications/notify.ts) — same pattern already used for
--    push_subscriptions reads in src/lib/push/send.ts — so there is
--    deliberately no insert policy below; RLS only needs to cover a user
--    reading and marking read their own rows.
-- ============================================================================

alter table profiles add column tour_version_seen integer not null default 1;

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, created_at desc);

alter table notifications enable row level security;

create policy "users can read their own notifications"
  on notifications for select to authenticated
  using (user_id = auth.uid());

create policy "users can mark their own notifications read"
  on notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No insert policy (service-role only, see header) and no delete policy —
-- mark-as-read is the only mutation a user can make to their own inbox for
-- now; a full "clear" action can be added later if asked for.
