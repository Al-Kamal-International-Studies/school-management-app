-- ============================================================================
-- Admin-authored announcements, surfaced on student/teacher dashboards.
-- Audience is a simple text filter, not a join table — this app has three
-- fixed roles, so "all / teacher / student" covers every case that matters.
-- ============================================================================

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'teacher', 'student')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_announcements_created_at on announcements(created_at desc);

alter table announcements enable row level security;

create policy "announcements are readable by matching audience"
  on announcements for select
  to authenticated
  using (audience = 'all' or audience = auth_role()::text or is_admin());

create policy "only admins can write announcements"
  on announcements for insert
  to authenticated
  with check (is_admin());

create policy "only admins can update announcements"
  on announcements for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "only admins can delete announcements"
  on announcements for delete
  to authenticated
  using (is_admin());
