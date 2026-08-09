-- ============================================================================
-- can_message() originally only covered admin<->anyone and teacher<->student
-- pairs. Parents were left out entirely except via the admin clause (a
-- parent could message an admin, but not their own child's teacher) — a
-- real gap once the parent portal shipped. This redefines can_message() to
-- also allow teacher<->parent when the teacher teaches one of that
-- parent's linked children, reusing is_parent_of()'s underlying
-- parent_students table. Purely additive — no existing conversation or
-- policy changes, just a broader definition of who's allowed to start one.
-- ============================================================================

create or replace function public.can_message(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from profiles where id in (a, b) and role = 'admin')
    or exists (
      select 1 from profiles pa, profiles pb
      where pa.id = a and pb.id = b
      and (
        (pa.role = 'teacher' and pb.role = 'student' and exists (
          select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
          where s.id = pb.id and cst.teacher_id = pa.id
        ))
        or
        (pa.role = 'student' and pb.role = 'teacher' and exists (
          select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
          where s.id = pa.id and cst.teacher_id = pb.id
        ))
        or
        (pa.role = 'teacher' and pb.role = 'parent' and exists (
          select 1 from parent_students ps
          join students s on s.id = ps.student_id
          join class_subject_teachers cst on cst.class_id = s.class_id
          where ps.parent_id = pb.id and cst.teacher_id = pa.id
        ))
        or
        (pa.role = 'parent' and pb.role = 'teacher' and exists (
          select 1 from parent_students ps
          join students s on s.id = ps.student_id
          join class_subject_teachers cst on cst.class_id = s.class_id
          where ps.parent_id = pa.id and cst.teacher_id = pb.id
        ))
      )
    );
$$;
