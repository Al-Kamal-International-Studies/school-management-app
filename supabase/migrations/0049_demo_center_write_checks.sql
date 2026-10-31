-- ============================================================================
-- 0049_demo_center_write_checks.sql — close three cross-center writes (HANDOVER Part 48)
-- ============================================================================
-- Found by Jack (Codex) reviewing 0048 (TEAM/reviews/2026-10-31-jack-6ead872.md).
-- 0048 walled DEMO off from AKIS for reads; these three write paths still let
-- a demo account (or any signed-in user calling PostgREST directly) put rows
-- that touch another center:
--   1. timetable INSERT/UPDATE checked only the class's center, so a DEMO class
--      could name an AKIS teacher and block that teacher's real slots (0044's
--      teacher-overlap constraint);
--   2. feedback INSERT never checked center_id, which defaults to AKIS, so a
--      demo user's feedback landed in the real admins' inbox;
--   3. a student's submission UPDATE never re-checked assignment_id, so an
--      ungraded submission could be moved onto another class's assignment.
-- Each fix makes the database enforce what the app's own Server Action
-- already checks. Live data checked before writing this: all 151 timetable
-- rows match a class_subject_teachers assignment; there is no feedback yet.
-- ============================================================================

-- 1. timetable: the class/subject/teacher triple must be a real assignment
-- (same check as lib/timetable/builderActions.ts) in a class you can access
drop policy "admins and teachers can write timetable" on timetable_entries;
create policy "admins and teachers can write timetable"
  on timetable_entries for insert to authenticated
  with check (
    auth_role() in ('admin', 'teacher')
    and exists (select 1 from classes c where c.id = timetable_entries.class_id and has_center_access(c.center_id))
    and exists (
      select 1 from class_subject_teachers cst
      where cst.class_id = timetable_entries.class_id
      and cst.subject_id = timetable_entries.subject_id
      and cst.teacher_id = timetable_entries.teacher_id
    )
  );

drop policy "admins and teachers can update timetable" on timetable_entries;
create policy "admins and teachers can update timetable"
  on timetable_entries for update to authenticated
  using (
    auth_role() in ('admin', 'teacher')
    and exists (select 1 from classes c where c.id = timetable_entries.class_id and has_center_access(c.center_id))
  )
  with check (
    auth_role() in ('admin', 'teacher')
    and exists (select 1 from classes c where c.id = timetable_entries.class_id and has_center_access(c.center_id))
    and exists (
      select 1 from class_subject_teachers cst
      where cst.class_id = timetable_entries.class_id
      and cst.subject_id = timetable_entries.subject_id
      and cst.teacher_id = timetable_entries.teacher_id
    )
  );

-- 2. feedback goes to a center you belong to (the app sends your own center;
-- omitting it falls back to the AKIS default, which a DEMO user no longer passes)
drop policy "users can submit their own feedback" on feedback;
create policy "users can submit their own feedback"
  on feedback for insert to authenticated
  with check (user_id = auth.uid() and status = 'new' and has_center_access(center_id));

-- 3. a student's submission update must still point at an assignment for
-- their own class, the same check INSERT already makes
drop policy "students can update their own pending submission" on assignment_submissions;
create policy "students can update their own pending submission"
  on assignment_submissions for update to authenticated
  -- A graded submission is the teacher's record; a student can't touch it.
  using (student_id = auth.uid() and status <> 'graded')
  with check (
    student_id = auth.uid()
    and status in ('pending', 'submitted')
    and public.submission_grade_fields_unchanged(id, grade, feedback)
    and public.student_can_submit_to(assignment_id)
  );
