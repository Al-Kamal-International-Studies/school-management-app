-- ============================================================================
-- Security hardening, batch 4: found while re-checking teacher-write RLS
-- policies against the sweep in docs/SECURITY.md. grades, attendance_records,
-- monthly_progress_entries, and assignment_submissions' teacher-grading
-- policy all verify "does this teacher teach this class+subject" via
-- class_subject_teachers, but never verify the specific student_id being
-- written is actually enrolled in that class — so a teacher could write a
-- grade/attendance/progress row for an arbitrary student UUID as long as
-- they supplied a class_id they legitimately teach. teacher_remarks and
-- behaviour_log already do this correctly (they join through `students s`
-- and check `s.id = <table>.student_id and s.class_id = cst.class_id`) —
-- this migration brings the other four policies up to that same standard.
-- Applied to both INSERT and UPDATE (the UPDATE policies were touched in
-- 0017_close_bopla_gaps.sql for a related but distinct fix — this replaces
-- them again with the fuller check).
-- ============================================================================

-- grades
drop policy "teachers can record grades for classes they teach" on grades;
create policy "teachers can record grades for classes they teach"
  on grades for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = grades.student_id and cst.class_id = grades.class_id and cst.subject_id = grades.subject_id and cst.teacher_id = auth.uid()
    )
  );

drop policy "teachers can update grades they recorded" on grades;
create policy "teachers can update grades they recorded"
  on grades for update to authenticated
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = grades.student_id and cst.class_id = grades.class_id and cst.subject_id = grades.subject_id and cst.teacher_id = auth.uid()
    )
  );

-- attendance_records
drop policy "teachers can mark attendance for classes they teach" on attendance_records;
create policy "teachers can mark attendance for classes they teach"
  on attendance_records for insert to authenticated with check (
    marked_by = auth.uid()
    and exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = attendance_records.student_id and cst.class_id = attendance_records.class_id and cst.teacher_id = auth.uid()
    )
  );

drop policy "teachers can update attendance they marked" on attendance_records;
create policy "teachers can update attendance they marked"
  on attendance_records for update to authenticated
  using (marked_by = auth.uid())
  with check (
    marked_by = auth.uid()
    and exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = attendance_records.student_id and cst.class_id = attendance_records.class_id and cst.teacher_id = auth.uid()
    )
  );

-- monthly_progress_entries
drop policy "teachers can insert progress entries for classes they teach" on monthly_progress_entries;
create policy "teachers can insert progress entries for classes they teach"
  on monthly_progress_entries for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = monthly_progress_entries.student_id
        and cst.class_id = monthly_progress_entries.class_id
        and cst.subject_id = monthly_progress_entries.subject_id
        and cst.teacher_id = auth.uid()
    )
  );

drop policy "teachers can update their own progress entries" on monthly_progress_entries;
create policy "teachers can update their own progress entries"
  on monthly_progress_entries for update to authenticated
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = monthly_progress_entries.student_id
        and cst.class_id = monthly_progress_entries.class_id
        and cst.subject_id = monthly_progress_entries.subject_id
        and cst.teacher_id = auth.uid()
    )
  );

-- assignment_submissions: the teacher-grading policy checked the assignment
-- belongs to the teacher, but not that the student being graded is in that
-- assignment's class.
drop policy "assignment teacher can insert a submission to grade it" on assignment_submissions;
create policy "assignment teacher can insert a submission to grade it"
  on assignment_submissions for insert to authenticated with check (
    exists (
      select 1 from assignments a join students s on s.class_id = a.class_id
      where a.id = assignment_submissions.assignment_id and a.teacher_id = auth.uid() and s.id = assignment_submissions.student_id
    )
  );

drop policy "assignment teacher can grade a submission" on assignment_submissions;
create policy "assignment teacher can grade a submission"
  on assignment_submissions for update to authenticated using (
    exists (
      select 1 from assignments a join students s on s.class_id = a.class_id
      where a.id = assignment_submissions.assignment_id and a.teacher_id = auth.uid() and s.id = assignment_submissions.student_id
    )
  );
