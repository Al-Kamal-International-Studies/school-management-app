-- ============================================================================
-- Row Level Security — defense in depth behind the app's own role checks.
-- Account creation/writes for teachers & students go through server actions
-- using the service-role key (which bypasses RLS), so these policies mainly
-- protect against a client hitting the Supabase API directly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: current user's role, without recursive RLS evaluation on profiles.
-- security definer + fixed search_path so it can be used inside policies.
-- ----------------------------------------------------------------------------
create or replace function public.auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

alter table profiles enable row level security;
alter table classes enable row level security;
alter table subjects enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table class_subject_teachers enable row level security;
alter table enrollments enable row level security;
alter table timetable_entries enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create policy "profiles are readable by any authenticated user"
  on profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

create policy "only admins can insert profiles directly"
  on profiles for insert
  to authenticated
  with check (is_admin());

create policy "only admins can delete profiles"
  on profiles for delete
  to authenticated
  using (is_admin());

-- ----------------------------------------------------------------------------
-- classes / subjects — school-wide reference data
-- ----------------------------------------------------------------------------
create policy "classes are readable by any authenticated user"
  on classes for select to authenticated using (true);
create policy "only admins can write classes"
  on classes for insert to authenticated with check (is_admin());
create policy "only admins can update classes"
  on classes for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can delete classes"
  on classes for delete to authenticated using (is_admin());

create policy "subjects are readable by any authenticated user"
  on subjects for select to authenticated using (true);
create policy "only admins can write subjects"
  on subjects for insert to authenticated with check (is_admin());
create policy "only admins can update subjects"
  on subjects for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can delete subjects"
  on subjects for delete to authenticated using (is_admin());

-- ----------------------------------------------------------------------------
-- teachers / students — profile extension tables
-- ----------------------------------------------------------------------------
create policy "teachers are readable by any authenticated user"
  on teachers for select to authenticated using (true);
create policy "only admins can write teachers"
  on teachers for insert to authenticated with check (is_admin());
create policy "only admins can update teachers"
  on teachers for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can delete teachers"
  on teachers for delete to authenticated using (is_admin());

create policy "students are readable by any authenticated user"
  on students for select to authenticated using (true);
create policy "only admins can write students"
  on students for insert to authenticated with check (is_admin());
create policy "only admins can update students"
  on students for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can delete students"
  on students for delete to authenticated using (is_admin());

-- ----------------------------------------------------------------------------
-- class_subject_teachers / enrollments / timetable_entries
-- ----------------------------------------------------------------------------
create policy "cst is readable by any authenticated user"
  on class_subject_teachers for select to authenticated using (true);
create policy "only admins can write cst"
  on class_subject_teachers for insert to authenticated with check (is_admin());
create policy "only admins can update cst"
  on class_subject_teachers for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can delete cst"
  on class_subject_teachers for delete to authenticated using (is_admin());

create policy "enrollments are readable by any authenticated user"
  on enrollments for select to authenticated using (true);
create policy "only admins can write enrollments"
  on enrollments for insert to authenticated with check (is_admin());
create policy "only admins can update enrollments"
  on enrollments for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can delete enrollments"
  on enrollments for delete to authenticated using (is_admin());

create policy "timetable is readable by any authenticated user"
  on timetable_entries for select to authenticated using (true);
create policy "only admins can write timetable"
  on timetable_entries for insert to authenticated with check (is_admin());
create policy "only admins can update timetable"
  on timetable_entries for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can delete timetable"
  on timetable_entries for delete to authenticated using (is_admin());
