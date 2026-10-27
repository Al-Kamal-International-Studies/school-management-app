-- ============================================================================
-- 0043 — fixes from the 2026-10-02 full-app audit (HANDOVER.md Part 33).
-- Seven independent problems, all proven live against the real API with
-- throwaway audit accounts. Safe to run as one script in the Supabase SQL
-- Editor; every statement is DROP-then-CREATE of a policy/function, no data
-- is touched, and nothing here changes a column or table shape.
--
--   1. profile_center_access — any admin could grant THEMSELVES (or anyone)
--      access to the other institution's center. [Critical]
--   2. assignment_submissions — (a) EVERY update/upsert failed with
--      "infinite recursion detected in policy" (students could not submit,
--      teachers could not grade — broken since 0017 shipped); (b) a student
--      could INSERT a submission that was already `graded` with any grade,
--      and for another class's assignment. [Critical x2]
--   3. students — SELECT was `using (true)`: every logged-in user, including
--      children, could read every child's guardian phone/email, home
--      address, emergency contacts and the `is_autistic` health flag, across
--      both centers. [High]
--   4. attendance_records — a second teacher of the same class could neither
--      see nor re-mark attendance another teacher had taken (the policies
--      keyed on `marked_by` alone); the save failed with a raw RLS error.
--      [High]
--   5. profiles.avatar_url — any user could store an arbitrary URL, which the
--      ID-card generator then fetched server-side (SSRF). [High]
--   6. leave_requests — a student/parent could INSERT a request already
--      `approved`, skipping admin review. [High]
--   7. admissions + outbound_emails — an admin with access to ONE center could
--      read every center's admissions and every pending welcome email (with
--      the family's plaintext temporary password) and create admissions in the
--      other center. [High]
--
-- NOT changed here, deliberately (see HANDOVER Part 33 for the reasoning and
-- the recommended follow-ups): `profiles` is still readable center-wide (the
-- whole app reads other users' names/avatars from it; narrowing it needs an
-- app-side refactor, not just a policy), `teachers` / `enrollments` /
-- `exams` / `timetable_entries` / `class_subject_teachers` are still
-- `using (true)` (schedule metadata, low sensitivity), and the teacher-wide
-- timetable write grant from 0042 is an intentional product decision.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. profile_center_access: only an admin who ALREADY holds a center may hand
--    out access to it. (Bootstrap grants — Muhammad's/Principal's AKET access,
--    new-user grants from the on_auth_user_created trigger — run as the
--    service role / security-definer trigger, which bypass RLS, so they are
--    unaffected.)
-- ----------------------------------------------------------------------------
drop policy if exists "only admins can grant center access" on profile_center_access;
create policy "only admins can grant center access"
  on profile_center_access for insert to authenticated
  with check (is_admin() and public.has_center_access(center_id));

drop policy if exists "only admins can update center access grants" on profile_center_access;
create policy "only admins can update center access grants"
  on profile_center_access for update to authenticated
  using (is_admin() and public.has_center_access(center_id))
  with check (is_admin() and public.has_center_access(center_id));

drop policy if exists "only admins can revoke center access" on profile_center_access;
create policy "only admins can revoke center access"
  on profile_center_access for delete to authenticated
  using (is_admin() and public.has_center_access(center_id));


-- ----------------------------------------------------------------------------
-- 2. assignment_submissions.
--
-- Root cause of the recursion: 0017's "students can update their own pending
-- submission" WITH CHECK contained `(select s.grade from
-- assignment_submissions s ...)` — a policy on a table that queries that same
-- table. Postgres expands every permissive policy for the command when it
-- rewrites the statement, so the self-reference raised "infinite recursion
-- detected in policy" for EVERY update and every INSERT ... ON CONFLICT DO
-- UPDATE, from every role (the teacher grading policy is expanded in the same
-- pass). Fix: do the "unchanged" comparison inside a SECURITY DEFINER helper,
-- which reads the table without going back through its RLS.
--
-- The INSERT policy was never hardened by 0017 (it only touched UPDATE), so a
-- student could insert {status:'graded', grade:99}. Same helper pattern for
-- the class-membership check.
-- ----------------------------------------------------------------------------
create or replace function public.submission_grade_fields_unchanged(sub_id uuid, new_grade numeric, new_feedback text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.assignment_submissions s
    where s.id = sub_id
      and s.grade is not distinct from new_grade
      and s.feedback is not distinct from new_feedback
  );
$$;

create or replace function public.student_can_submit_to(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.assignments a
    join public.students s on s.class_id = a.class_id
    where a.id = target_assignment_id and s.id = auth.uid()
  );
$$;

drop policy if exists "students can update their own pending submission" on assignment_submissions;
create policy "students can update their own pending submission"
  on assignment_submissions for update to authenticated
  -- A graded submission is the teacher's record; a student can't touch it.
  using (student_id = auth.uid() and status <> 'graded')
  with check (
    student_id = auth.uid()
    and status in ('pending', 'submitted')
    and public.submission_grade_fields_unchanged(id, grade, feedback)
  );

drop policy if exists "students can mark their own submission as submitted" on assignment_submissions;
create policy "students can mark their own submission as submitted"
  on assignment_submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and status in ('pending', 'submitted')
    and grade is null
    and feedback is null
    and public.student_can_submit_to(assignment_id)
  );


-- ----------------------------------------------------------------------------
-- 3. students: relationship-scoped SELECT instead of `using (true)`.
--
-- Who may read a student row: the student; a linked parent; a teacher who
-- teaches that student's class (class_subject_teachers) or is its homeroom
-- teacher, or who is assigned to that student in the Autism Section; an admin
-- with access to the student's center. Implemented in a SECURITY DEFINER
-- helper (same pattern as is_parent_of / can_message) so the policy never
-- re-enters RLS on the tables it consults — no recursion risk, and it keeps
-- working if those tables' own policies change later.
-- Writes are unchanged (admin / service role only). can_message() and the
-- other existing helpers are SECURITY DEFINER already and are unaffected.
-- ----------------------------------------------------------------------------
create or replace function public.can_view_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_student_id = auth.uid()
    or exists (
      select 1 from public.parent_students ps
      where ps.parent_id = auth.uid() and ps.student_id = target_student_id
    )
    or exists (
      select 1 from public.students s
      join public.class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = target_student_id and cst.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = target_student_id and c.homeroom_teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.autism_assignments aa
      where aa.student_id = target_student_id and aa.teacher_id = auth.uid()
    )
    or (
      public.is_admin()
      and exists (
        select 1 from public.profiles p
        where p.id = target_student_id and public.has_center_access(p.center_id)
      )
    );
$$;

drop policy if exists "students are readable by any authenticated user" on students;
drop policy if exists "students are readable by self, guardian, their teachers, and center admins" on students;
create policy "students are readable by self, guardian, their teachers, and center admins"
  on students for select to authenticated
  using (public.can_view_student(id));


-- ----------------------------------------------------------------------------
-- 4. attendance_records: every teacher of a class sees and can re-mark that
--    class's attendance (previously only the teacher who first marked a row,
--    so a second teacher saw an empty sheet and their save raised a raw RLS
--    error). `marked_by` still records who made the latest change.
-- ----------------------------------------------------------------------------
drop policy if exists "teachers can view attendance for classes they teach" on attendance_records;
create policy "teachers can view attendance for classes they teach"
  on attendance_records for select to authenticated
  using (
    exists (
      select 1 from class_subject_teachers cst
      where cst.class_id = attendance_records.class_id and cst.teacher_id = auth.uid()
    )
  );

drop policy if exists "teachers can update attendance they marked" on attendance_records;
drop policy if exists "teachers can update attendance for classes they teach" on attendance_records;
create policy "teachers can update attendance for classes they teach"
  on attendance_records for update to authenticated
  using (
    exists (
      select 1 from class_subject_teachers cst
      where cst.class_id = attendance_records.class_id and cst.teacher_id = auth.uid()
    )
  )
  with check (
    marked_by = auth.uid()
    and exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = attendance_records.student_id and cst.class_id = attendance_records.class_id and cst.teacher_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 5. profiles.avatar_url: only this project's public "avatars" bucket paths.
--    The column is user-writable (a user edits their own avatar) and the ID
--    card generator used to fetch whatever URL was stored there server-side
--    (SSRF). The app now validates the host too (src/lib/security/avatarUrl.ts);
--    this constraint is the database-level backstop so a direct API write
--    can't store an arbitrary URL either. Checked against production first:
--    every existing avatar_url already matches.
-- ----------------------------------------------------------------------------
alter table profiles drop constraint if exists profiles_avatar_url_in_avatars_bucket;
alter table profiles
  add constraint profiles_avatar_url_in_avatars_bucket
  check (avatar_url is null or avatar_url ~ '^https?://[^/]+/storage/v1/object/public/avatars/');


-- ----------------------------------------------------------------------------
-- 6. leave_requests: a student or parent could INSERT a request that was
--    already `approved` (and with a spoofed `reviewed_by`), skipping the admin
--    review entirely. Submitters may only create `pending`, unreviewed
--    requests; only the admin UPDATE policy can change the status.
-- ----------------------------------------------------------------------------
drop policy if exists "students can submit their own leave requests" on leave_requests;
create policy "students can submit their own leave requests"
  on leave_requests for insert to authenticated
  with check (student_id = auth.uid() and status = 'pending' and reviewed_by is null);

drop policy if exists "parents can submit a leave request for their child" on leave_requests;
create policy "parents can submit a leave request for their child"
  on leave_requests for insert to authenticated
  with check (is_parent_of(student_id) and status = 'pending' and reviewed_by is null);


-- ----------------------------------------------------------------------------
-- 7. admissions + outbound_emails: center scoping. Both policies were
--    `is_admin()` alone, so an admin with access to only one center could read
--    EVERY center's admissions (child + parent personal data) and — worse — every
--    pending welcome email, which carries the family's plaintext temporary
--    password, and could create admissions/accounts in the other center.
--    Now an admin only reaches rows of centers they hold access to (same rule
--    classes/subjects/announcements/events/documents/feedback already use).
--    Server code that legitimately spans centers uses the service role.
-- ----------------------------------------------------------------------------
drop policy if exists "admins manage admissions" on admissions;
create policy "admins manage admissions"
  on admissions for all to authenticated
  using (is_admin() and public.has_center_access(center_id))
  with check (is_admin() and public.has_center_access(center_id));

drop policy if exists "admins can view outbound emails" on outbound_emails;
create policy "admins can view outbound emails"
  on outbound_emails for select to authenticated
  using (
    is_admin()
    and (
      -- Admission-related emails follow the admission's center; anything else
      -- (no admission link) stays visible to any admin as before.
      related_table is distinct from 'admissions'
      or exists (
        select 1 from admissions a
        where a.id = outbound_emails.related_id and public.has_center_access(a.center_id)
      )
    )
  );
