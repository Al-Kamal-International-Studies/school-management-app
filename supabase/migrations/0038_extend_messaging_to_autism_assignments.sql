-- ============================================================================
-- Bug fix, found during live QA testing of the Autism Section feature
-- (Part 11): the "Message Parent" button (autism/[studentId]'s
-- MessageParentButton.tsx, calling startConversationAction) silently failed
-- for every teacher<->parent pair created through the Autism Section —
-- redirecting to /messages with no conversation created, because
-- can_message() (0015_extend_messaging_to_parents.sql) only recognizes a
-- teacher<->parent pairing via class_subject_teachers + the student's
-- class_id. Autism Section students are deliberately NOT enrolled in a
-- class (0033_autism_section.sql's own design — intake is separate from
-- class placement), so that join never matched and the insert was silently
-- rejected by RLS (startConversationAction's `if (error || !created)
-- redirect("/messages")` swallowed the failure instead of surfacing it,
-- which is how this shipped without a visible error).
--
-- Fix: purely additive, same shape as 0015's own extension — add a second
-- teacher<->parent clause recognizing the autism_assignments relationship,
-- alongside (not replacing) the existing class-enrollment-based one.
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
        or
        (pa.role = 'teacher' and pb.role = 'parent' and exists (
          select 1 from parent_students ps
          join autism_assignments aa on aa.student_id = ps.student_id
          where ps.parent_id = pb.id and aa.teacher_id = pa.id
        ))
        or
        (pa.role = 'parent' and pb.role = 'teacher' and exists (
          select 1 from parent_students ps
          join autism_assignments aa on aa.student_id = ps.student_id
          where ps.parent_id = pa.id and aa.teacher_id = pb.id
        ))
      )
    );
$$;
