-- ============================================================================
-- Batch 2 of the backlog: event calendar, document center, and admin
-- audit logging. Same conventions as prior migrations.
--
-- Documents: the "documents" Storage bucket is created NON-public on
-- purpose (unlike "avatars"). All reads/writes go through Server Actions
-- using the service-role admin client — the `documents` table's own RLS
-- gates who is *allowed* to see a given document (checked with the regular
-- client first), and only then does the server generate a short-lived
-- signed URL via the service-role client. No storage.objects policies are
-- needed at all under this design, since the service role bypasses them.
-- ============================================================================

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  event_type text not null default 'event' check (event_type in ('event', 'holiday', 'deadline')),
  audience text not null default 'all' check (audience in ('all', 'teacher', 'student')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_events_date on events(event_date);

create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'general' check (category in ('admit_card', 'report_card', 'certificate', 'policy', 'general')),
  audience text not null default 'all' check (audience in ('all', 'teacher', 'student')),
  student_id uuid references students(id) on delete cascade,
  file_path text not null,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_documents_student_id on documents(student_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_created_at on audit_logs(created_at desc);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table events enable row level security;
alter table documents enable row level security;
alter table audit_logs enable row level security;

create policy "events are readable by matching audience"
  on events for select to authenticated using (audience = 'all' or audience = auth_role()::text or is_admin());
create policy "only admins can write events"
  on events for insert to authenticated with check (is_admin());
create policy "only admins can update events"
  on events for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can delete events"
  on events for delete to authenticated using (is_admin());

create policy "documents are readable by matching audience or the linked student"
  on documents for select to authenticated using (
    is_admin()
    or student_id = auth.uid()
    or (student_id is null and (audience = 'all' or audience = auth_role()::text))
  );
create policy "only admins can write documents"
  on documents for insert to authenticated with check (is_admin());
create policy "only admins can delete documents"
  on documents for delete to authenticated using (is_admin());

create policy "admins can view all audit logs"
  on audit_logs for select to authenticated using (is_admin());
create policy "users can log their own actions"
  on audit_logs for insert to authenticated with check (actor_id = auth.uid());
