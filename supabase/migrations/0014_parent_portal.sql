-- ============================================================================
-- Batch 4 of the backlog: parent portal, step 2 of 2. Run this ONLY after
-- 0013_parent_role_enum.sql has completed (see that file's comment).
--
-- Parents get READ-ONLY access to their linked children's records across
-- every table that already exists — no new data model for attendance,
-- grades, etc., just additive RLS policies gated by is_parent_of(). This
-- keeps the parent portal additive rather than a parallel system.
-- ============================================================================

create table parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

create index idx_parent_students_parent on parent_students(parent_id);
create index idx_parent_students_student on parent_students(student_id);

create or replace function public.is_parent_of(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from parent_students ps where ps.parent_id = auth.uid() and ps.student_id = target_student_id);
$$;

alter table parent_students enable row level security;

create policy "parents can view their own child links"
  on parent_students for select to authenticated using (parent_id = auth.uid() or is_admin());
create policy "only admins can link a parent to a student"
  on parent_students for insert to authenticated with check (is_admin());
create policy "only admins can remove a parent-student link"
  on parent_students for delete to authenticated using (is_admin());

-- ----------------------------------------------------------------------------
-- Additive read policies on existing tables (multiple permissive SELECT
-- policies on the same table are OR'd together in Postgres RLS, so these
-- don't touch or risk breaking any existing policy).
-- ----------------------------------------------------------------------------
create policy "parents can view their children's attendance"
  on attendance_records for select to authenticated using (is_parent_of(student_id));

create policy "parents can view their children's progress entries"
  on monthly_progress_entries for select to authenticated using (is_parent_of(student_id));

create policy "parents can view assignments for their children's class"
  on assignments for select to authenticated using (
    exists (select 1 from students s where s.class_id = assignments.class_id and is_parent_of(s.id))
  );

create policy "parents can view their children's submissions"
  on assignment_submissions for select to authenticated using (is_parent_of(student_id));

create policy "parents can view their children's grades"
  on grades for select to authenticated using (is_parent_of(student_id));

create policy "parents can view their children's teacher remarks"
  on teacher_remarks for select to authenticated using (is_parent_of(student_id));

create policy "parents can view their children's behaviour log"
  on behaviour_log for select to authenticated using (is_parent_of(student_id));

create policy "parents can view their children's leave requests"
  on leave_requests for select to authenticated using (is_parent_of(student_id));
create policy "parents can submit a leave request for their child"
  on leave_requests for insert to authenticated with check (is_parent_of(student_id));

create policy "parents can view documents linked to their children"
  on documents for select to authenticated using (student_id is not null and is_parent_of(student_id));

create policy "parents can view student-audience announcements"
  on announcements for select to authenticated using (
    audience in ('all', 'student') and exists (select 1 from parent_students where parent_id = auth.uid())
  );

create policy "parents can view student-audience events"
  on events for select to authenticated using (
    audience in ('all', 'student') and exists (select 1 from parent_students where parent_id = auth.uid())
  );
