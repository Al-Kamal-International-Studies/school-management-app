-- ============================================================================
-- Security hardening, batch 2: close Broken Object Property Level
-- Authorization (BOPLA) gaps found in docs/SECURITY.md.
--
-- Root cause common to F1/F2 below: a "you can update your own row" RLS
-- policy checks WHO owns the row, not WHICH COLUMNS a non-privileged caller
-- is allowed to change. The app's own Server Actions only ever send the
-- intended columns, but RLS — not the UI — is this project's documented
-- real boundary (HANDOVER.md §8.1), and on these two tables it wasn't
-- actually restricting column writes, only row access. Fixed by pinning
-- privileged columns to their existing stored value whenever a non-admin
-- (or, for submissions, the student themselves) is the one writing.
--
-- F4 below is a related but distinct gap: five UPDATE policies re-checked
-- "is this my row" but not the class_subject_teachers relationship their
-- sibling INSERT policy already enforces — so a teacher could, via UPDATE
-- only, re-point an owned row at a student/class outside their assignment.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- F1 — profiles: non-admins could set role/is_active/archived_at/archived_by/
-- title/email/date_of_birth on their own row via a direct API call (full
-- privilege escalation to admin). Admin-driven updates (via the regular
-- client, e.g. setUserActiveAction/archiveUserAction) are untouched — the
-- `is_admin()` branch has no column restriction, matching current behavior.
-- ----------------------------------------------------------------------------
drop policy "users can update their own profile" on profiles;

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid() or is_admin())
  with check (
    is_admin()
    or (
      id = auth.uid()
      and (role, is_active, archived_at, archived_by, title, email, date_of_birth)
          is not distinct from (
            select role, is_active, archived_at, archived_by, title, email, date_of_birth
            from profiles where id = auth.uid()
          )
    )
  );

-- ----------------------------------------------------------------------------
-- F2 — assignment_submissions: a student could set grade/feedback/status on
-- their own submission directly, bypassing the teacher grading flow
-- entirely. Now: grade/feedback are pinned to their stored value, and
-- status can only move within the student's own legitimate range (never
-- straight to "graded", which only the teacher's separate UPDATE policy —
-- unchanged — allows).
-- ----------------------------------------------------------------------------
drop policy "students can update their own pending submission" on assignment_submissions;

create policy "students can update their own pending submission"
  on assignment_submissions for update
  to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and status in ('pending', 'submitted')
    and (grade, feedback) is not distinct from (
      select grade, feedback from assignment_submissions where id = assignment_submissions.id
    )
  );

-- ----------------------------------------------------------------------------
-- F4 — re-add the class_subject_teachers ownership check to UPDATE policies
-- that were missing it (their sibling INSERT policy already had it). Without
-- this, a teacher could take a row they legitimately own and re-point its
-- student/class/subject to one they don't teach.
-- ----------------------------------------------------------------------------
drop policy "teachers can update grades they recorded" on grades;
create policy "teachers can update grades they recorded"
  on grades for update to authenticated
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from class_subject_teachers cst where cst.class_id = grades.class_id and cst.subject_id = grades.subject_id and cst.teacher_id = auth.uid())
  );

drop policy "teachers can update their own assignments" on assignments;
create policy "teachers can update their own assignments"
  on assignments for update to authenticated
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from class_subject_teachers cst where cst.class_id = assignments.class_id and cst.subject_id = assignments.subject_id and cst.teacher_id = auth.uid())
  );

drop policy "teachers can update their own exams" on exams;
create policy "teachers can update their own exams"
  on exams for update to authenticated
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from class_subject_teachers cst where cst.class_id = exams.class_id and cst.subject_id = exams.subject_id and cst.teacher_id = auth.uid())
  );

drop policy "teachers can update attendance they marked" on attendance_records;
create policy "teachers can update attendance they marked"
  on attendance_records for update to authenticated
  using (marked_by = auth.uid())
  with check (
    marked_by = auth.uid()
    and exists (select 1 from class_subject_teachers cst where cst.class_id = attendance_records.class_id and cst.teacher_id = auth.uid())
  );

drop policy "teachers can update their own progress entries" on monthly_progress_entries;
create policy "teachers can update their own progress entries"
  on monthly_progress_entries for update
  to authenticated
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from class_subject_teachers cst
      where cst.class_id = monthly_progress_entries.class_id
        and cst.subject_id = monthly_progress_entries.subject_id
        and cst.teacher_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- F10 (low severity, cheap to close) — a user could insert their own
-- feedback pre-marked as any status ('resolved', etc.) instead of always
-- starting at 'new'. Doesn't expose or corrupt anyone else's data, but has
-- no legitimate reason to be allowed either.
-- ----------------------------------------------------------------------------
drop policy "users can submit their own feedback" on feedback;
create policy "users can submit their own feedback"
  on feedback for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'new');
