-- ============================================================================
-- In-app feedback channel for teachers/students. Stored in-app only for now
-- (no email/Google Sheet sync — deferred until real credentials are
-- provided; see the admin Feedback inbox for the in-app view). Name/role/
-- email aren't duplicated here — the admin inbox joins back to `profiles`
-- for those, same as every other feature in this schema.
-- ============================================================================

create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category text not null check (category in ('technical', 'academic', 'suggestion', 'general')),
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

create index idx_feedback_user_id on feedback(user_id);
create index idx_feedback_status on feedback(status);

alter table feedback enable row level security;

create policy "users can view their own feedback"
  on feedback for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

create policy "users can submit their own feedback"
  on feedback for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "only admins can update feedback status"
  on feedback for update
  to authenticated
  using (is_admin())
  with check (is_admin());
