-- ============================================================================
-- 0048_demo_center.sql — an isolated DEMO center for prospects (HANDOVER Part 45)
-- ============================================================================
-- Muhammad hands a prospective client teacher / student / parent logins on the
-- live app. Those accounts live in their own center (DEMO) with made-up
-- people, so everything center-scoped hides AKIS from them at the database
-- level, not only in the UI. The app lets a DEMO grant sign in only for
-- non-admin roles (lib/centers/hasAkisAccess.ts) — admin pages read AKIS data
-- by design, so there is never a demo admin login.
--
-- Doing that exposed reads and writes that were never scoped to a center
-- because, with one real institution, "any signed-in user" meant "AKIS":
--   1. parents' extra announcement/event policies had no center check;
--   2. exams, teachers, enrollments, class_subject_teachers and
--      timetable_entries were readable by any signed-in user;
--   3. ANY teacher could insert/update/delete ANY timetable row (0042);
--   4. can_start_chat only checked that the other person is in AKIS;
--   5. the legacy dm tables let anyone open a conversation with any admin;
--   6. the avatars bucket listing was readable by anyone, even signed out,
--      so every profile photo could be enumerated with the public anon key.
-- For AKIS users nothing changes: they hold the AKIS grant, so every new
-- has_center_access() check passes for AKIS rows exactly as before.
-- ============================================================================

insert into centers (id, name, short_code, logo_path) values
  ('00000000-0000-0000-0000-000000000003', 'AKIS Demo (prospects)', 'DEMO', '/brand/seal-navy.png')
on conflict (id) do nothing;

-- True when a and b share a center this app serves (AKIS or DEMO). AKET-only
-- accounts can no longer sign in (Part 37), so a shared AKET grant doesn't count.
create or replace function public.shares_app_center(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profile_center_access x
    join profile_center_access y on y.center_id = x.center_id
    where x.profile_id = a and y.profile_id = b
    and x.center_id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003')
  );
$$;
revoke execute on function public.shares_app_center(uuid, uuid) from public, anon;
grant execute on function public.shares_app_center(uuid, uuid) to authenticated, service_role;

-- 1. parents' announcement/event policies
drop policy "parents can view student-audience announcements" on announcements;
create policy "parents can view student-audience announcements"
  on announcements for select to authenticated
  using (
    has_center_access(center_id)
    and audience in ('all', 'student')
    and exists (select 1 from parent_students where parent_id = auth.uid())
  );

drop policy "parents can view student-audience events" on events;
create policy "parents can view student-audience events"
  on events for select to authenticated
  using (
    has_center_access(center_id)
    and audience in ('all', 'student')
    and exists (select 1 from parent_students where parent_id = auth.uid())
  );

-- 2. tables that were readable by any signed-in user: scope them to the
-- center of the class (or of the teacher's profile)
drop policy "exams are readable by any authenticated user" on exams;
create policy "exams are readable within accessible centers"
  on exams for select to authenticated
  using (exists (select 1 from classes c where c.id = exams.class_id and has_center_access(c.center_id)));

drop policy "enrollments are readable by any authenticated user" on enrollments;
create policy "enrollments are readable within accessible centers"
  on enrollments for select to authenticated
  using (exists (select 1 from classes c where c.id = enrollments.class_id and has_center_access(c.center_id)));

drop policy "cst is readable by any authenticated user" on class_subject_teachers;
create policy "cst is readable within accessible centers"
  on class_subject_teachers for select to authenticated
  using (exists (select 1 from classes c where c.id = class_subject_teachers.class_id and has_center_access(c.center_id)));

drop policy "teachers are readable by any authenticated user" on teachers;
create policy "teachers are readable within accessible centers"
  on teachers for select to authenticated
  using (exists (select 1 from profiles p where p.id = teachers.id and (p.id = auth.uid() or has_center_access(p.center_id))));

drop policy "timetable is readable by any authenticated user" on timetable_entries;
create policy "timetable is readable within accessible centers"
  on timetable_entries for select to authenticated
  using (exists (select 1 from classes c where c.id = timetable_entries.class_id and has_center_access(c.center_id)));

-- 3. timetable writes: still any teacher (0042, Muhammad's choice), but only
-- for classes in a center they belong to
drop policy "admins and teachers can write timetable" on timetable_entries;
create policy "admins and teachers can write timetable"
  on timetable_entries for insert to authenticated
  with check (
    auth_role() in ('admin', 'teacher')
    and exists (select 1 from classes c where c.id = timetable_entries.class_id and has_center_access(c.center_id))
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
  );

drop policy "admins and teachers can delete timetable" on timetable_entries;
create policy "admins and teachers can delete timetable"
  on timetable_entries for delete to authenticated
  using (
    auth_role() in ('admin', 'teacher')
    and exists (select 1 from classes c where c.id = timetable_entries.class_id and has_center_access(c.center_id))
  );

-- 4. chats: the other person must share a center with me (was: be in AKIS).
-- Body otherwise identical to 0046.
create or replace function public.can_start_chat(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select a <> b and exists (
    select 1 from profiles pa, profiles pb
    where pa.id = a and pb.id = b
    and pa.is_active and pb.is_active and pa.archived_at is null and pb.archived_at is null
    and public.shares_app_center(a, b)
    and (
      pa.role = 'admin'
      or (pb.role = 'admin' and pa.role in ('teacher', 'parent'))
      or (pa.role = 'teacher' and pb.role = 'student' and exists (
        select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
        where s.id = b and cst.teacher_id = a
      ))
      or (pa.role = 'student' and pb.role = 'teacher' and exists (
        select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
        where s.id = a and cst.teacher_id = b
      ))
      or (pa.role = 'teacher' and pb.role = 'parent' and (
        exists (
          select 1 from parent_students ps join students s on s.id = ps.student_id
          join class_subject_teachers cst on cst.class_id = s.class_id
          where ps.parent_id = b and cst.teacher_id = a
        )
        or exists (
          select 1 from parent_students ps join autism_assignments aa on aa.student_id = ps.student_id
          where ps.parent_id = b and aa.teacher_id = a
        )
      ))
      or (pa.role = 'parent' and pb.role = 'teacher' and (
        exists (
          select 1 from parent_students ps join students s on s.id = ps.student_id
          join class_subject_teachers cst on cst.class_id = s.class_id
          where ps.parent_id = a and cst.teacher_id = b
        )
        or exists (
          select 1 from parent_students ps join autism_assignments aa on aa.student_id = ps.student_id
          where ps.parent_id = a and aa.teacher_id = b
        )
      ))
    )
  );
$$;

-- 5. legacy dm tables (unused since 0046): same-center only
drop policy "users can start a conversation with someone they're allowed to message" on dm_conversations;
create policy "users can start a conversation with someone they're allowed to message"
  on dm_conversations for insert to authenticated
  with check (
    (participant_a = auth.uid() or participant_b = auth.uid())
    and can_message(participant_a, participant_b)
    and shares_app_center(participant_a, participant_b)
  );

-- 6. avatars: public URLs keep working (a public bucket serves them without
-- RLS); listing/reading object rows is limited to your own folder, which is
-- all AvatarUpload's upsert needs.
drop policy "avatar images are publicly readable" on storage.objects;
create policy "users can read their own avatar objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
