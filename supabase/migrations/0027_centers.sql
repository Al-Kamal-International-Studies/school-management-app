-- ============================================================================
-- Multi-center support, batch 1: this app now serves TWO related
-- institutions from one codebase/one database — Al Kamal International
-- Studies ("AKIS", the existing school, all of whose real data already
-- lives here) and Al Kamal Education Technology ("AKET", a brand-new second
-- center with zero real students/staff/classes as of this migration).
--
-- Decision (Muhammad, 2026-08-16): one codebase, one Supabase database,
-- shared for both centers, distinguished by a center_id column — NOT a
-- second deployment/repo/database.
--
-- Fixed, well-known UUIDs are used for the two seed `centers` rows (rather
-- than gen_random_uuid()) specifically so this migration can reference them
-- directly in column DEFAULTs and backfill UPDATEs below without a
-- subquery — Postgres does not allow a subquery in a column DEFAULT
-- expression, so a fixed literal is the safe, deterministic way to do this
-- in one migration file:
--   AKIS = 00000000-0000-0000-0000-000000000001
--   AKET = 00000000-0000-0000-0000-000000000002
--
-- ----------------------------------------------------------------------------
-- SCOPE — which tables got a center_id, and which deliberately did not.
-- ----------------------------------------------------------------------------
-- Given center_id: profiles, classes, subjects, announcements, events,
-- documents. These are the tables that are genuinely, directly center-scoped
-- reference/identity data — "which school is this person/class/subject/post
-- part of" is a first-class fact about the row itself.
--
-- Deliberately NOT given their own center_id (they inherit center identity
-- indirectly, via a join to one of the six tables above — mechanically
-- adding center_id to every table in the schema was avoided on purpose):
-- teachers, students (1:1 extensions of profiles, keyed by profiles.id),
-- class_subject_teachers, enrollments, timetable_entries,
-- monthly_progress_entries, attendance_records, assignments,
-- assignment_submissions, exams, grades, teacher_remarks, behaviour_log,
-- leave_requests (all reachable via class_id and/or student_id ->
-- students.id -> profiles.id), feedback, dm_conversations, dm_messages,
-- push_subscriptions, parent_students, user_devices, webauthn_credentials,
-- chatbot_conversations, chatbot_messages (all reachable via a user_id/
-- profile_id column -> profiles.id), audit_logs, rate_limit_events,
-- password_reset_requests (operational/system logs, not tenant data in the
-- same sense).
--
-- Known, honestly-flagged limitation: the tables in the paragraph above keep
-- whatever RLS they had *before* this migration, which for several of them
-- (class_subject_teachers, enrollments, timetable_entries) is a blanket
-- "readable by any authenticated user" policy with no center awareness at
-- all. That gap already existed before this migration (this app has only
-- ever served one center's worth of data), and this migration does not
-- close it by joining through class_id everywhere — that would mean
-- rewriting RLS on ~12 more tables in the same pass as a live-database
-- schema change, which was judged too large/risky to do reliably here. It
-- is a real, pre-existing gap and is not made any worse by this migration,
-- but it should be closed with join-based center checks (e.g.
-- `exists (select 1 from classes c where c.id = enrollments.class_id and
-- public.has_center_access(c.center_id))`) before AKET has real students/
-- teachers/classes of its own — right now it's a non-issue in practice
-- because AKET has zero rows in any of these tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- centers
-- ----------------------------------------------------------------------------
create table centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text not null unique,
  logo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table centers is 'The institutions this app serves. One shared codebase/database, scoped per-row by center_id.';

insert into centers (id, name, short_code, logo_path) values
  ('00000000-0000-0000-0000-000000000001', 'Al Kamal International Studies', 'AKIS', '/brand/seal-navy.png'),
  ('00000000-0000-0000-0000-000000000002', 'Al Kamal Education Technology', 'AKET', '/brand/aket-monogram.svg');

-- ----------------------------------------------------------------------------
-- profile_center_access: which centers a given profile may access. Every
-- profile gets exactly one row (its home center) via the backfill below.
-- A profile with MORE than one row is a multi-center account (e.g. an admin
-- who legitimately oversees both AKIS and AKET) — this is what the
-- center-switcher UI checks to decide whether to render at all.
-- ----------------------------------------------------------------------------
create table profile_center_access (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  center_id uuid not null references centers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, center_id)
);

comment on table profile_center_access is 'Grants: which centers a profile may access. >1 row for a profile = multi-center account (sees the center switcher).';

create index idx_profile_center_access_profile_id on profile_center_access(profile_id);

-- Backfill: every existing profile gets access to AKIS (the only center with
-- real data). This runs BEFORE profiles.center_id is added below so it does
-- not depend on that column existing yet.
insert into profile_center_access (profile_id, center_id)
select id, '00000000-0000-0000-0000-000000000001' from profiles
on conflict (profile_id, center_id) do nothing;

-- Deliberate, explicit exception: grant Muhammad's own admin account
-- (Director, per HANDOVER.md) access to AKET too, so the center switcher
-- this migration ships alongside has at least one real account that can
-- actually use it, matching the task's own framing of who the switcher is
-- for. No other account is granted multi-center access here. Guarded with
-- a WHERE EXISTS-style select so this is a no-op (not an error) on any
-- database where that account doesn't exist.
insert into profile_center_access (profile_id, center_id)
select id, '00000000-0000-0000-0000-000000000002' from profiles
where lower(email) = 'muhammad@alkamalinternational.com'
on conflict (profile_id, center_id) do nothing;

-- ----------------------------------------------------------------------------
-- profiles.center_id
-- ----------------------------------------------------------------------------
alter table profiles add column center_id uuid references centers(id) default '00000000-0000-0000-0000-000000000001';
update profiles set center_id = '00000000-0000-0000-0000-000000000001' where center_id is null;
alter table profiles alter column center_id set not null;
create index idx_profiles_center_id on profiles(center_id);

-- ----------------------------------------------------------------------------
-- classes.center_id
-- ----------------------------------------------------------------------------
alter table classes add column center_id uuid references centers(id) default '00000000-0000-0000-0000-000000000001';
update classes set center_id = '00000000-0000-0000-0000-000000000001' where center_id is null;
alter table classes alter column center_id set not null;
create index idx_classes_center_id on classes(center_id);

-- Loosen the old global "name/section/academic_year must be unique" rule to
-- per-center, so AKET can eventually have its own "Grade 1 - A" independent
-- of AKIS's. Looked up dynamically by column composition rather than by
-- hardcoding the default-generated constraint name (this migration was
-- written without live access to confirm the exact name Postgres assigned
-- back in 0001_schema.sql — safer to find it than to guess it).
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.classes'::regclass
    and contype = 'u'
    and cardinality(conkey) = 3
    and conkey <@ (
      select array_agg(attnum) from pg_attribute
      where attrelid = 'public.classes'::regclass and attname in ('name', 'section', 'academic_year')
    );
  if cname is not null then
    execute format('alter table public.classes drop constraint %I', cname);
  end if;
end $$;

alter table classes add constraint classes_center_name_section_year_key unique (center_id, name, section, academic_year);

-- ----------------------------------------------------------------------------
-- subjects.center_id
-- ----------------------------------------------------------------------------
alter table subjects add column center_id uuid references centers(id) default '00000000-0000-0000-0000-000000000001';
update subjects set center_id = '00000000-0000-0000-0000-000000000001' where center_id is null;
alter table subjects alter column center_id set not null;
create index idx_subjects_center_id on subjects(center_id);

-- Same reasoning as classes above: subject codes only need to be unique
-- within a center, not globally.
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.subjects'::regclass
    and contype = 'u'
    and cardinality(conkey) = 1
    and conkey <@ (
      select array_agg(attnum) from pg_attribute
      where attrelid = 'public.subjects'::regclass and attname = 'code'
    );
  if cname is not null then
    execute format('alter table public.subjects drop constraint %I', cname);
  end if;
end $$;

alter table subjects add constraint subjects_center_code_key unique (center_id, code);

-- ----------------------------------------------------------------------------
-- announcements.center_id / events.center_id / documents.center_id
-- ----------------------------------------------------------------------------
alter table announcements add column center_id uuid references centers(id) default '00000000-0000-0000-0000-000000000001';
update announcements set center_id = '00000000-0000-0000-0000-000000000001' where center_id is null;
alter table announcements alter column center_id set not null;
create index idx_announcements_center_id on announcements(center_id);

alter table events add column center_id uuid references centers(id) default '00000000-0000-0000-0000-000000000001';
update events set center_id = '00000000-0000-0000-0000-000000000001' where center_id is null;
alter table events alter column center_id set not null;
create index idx_events_center_id on events(center_id);

alter table documents add column center_id uuid references centers(id) default '00000000-0000-0000-0000-000000000001';
update documents set center_id = '00000000-0000-0000-0000-000000000001' where center_id is null;
alter table documents alter column center_id set not null;
create index idx_documents_center_id on documents(center_id);

-- ----------------------------------------------------------------------------
-- Helper: does the current session's user have access to a given center?
-- Same security-definer + fixed search_path pattern as auth_role()/
-- is_admin() (0002_rls_policies.sql) so it's safe to call from any policy.
-- ----------------------------------------------------------------------------
create or replace function public.has_center_access(target_center_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile_center_access pca
    where pca.profile_id = auth.uid() and pca.center_id = target_center_id
  );
$$;

-- ----------------------------------------------------------------------------
-- handle_new_user(): forward-compatible so a future account-creation flow
-- for AKET can pass center_id via user_metadata (same mechanism already
-- used for role/full_name). Defaults to AKIS when no center_id is given,
-- which is exactly today's behavior for every existing caller (none of them
-- pass center_id yet) — this is additive, not a behavior change. Also
-- inserts the matching profile_center_access grant row atomically, so a
-- newly created user can immediately see their own center's data (without
-- this, has_center_access() would return false for them even though their
-- own profiles.center_id is set correctly).
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_center_id uuid;
begin
  new_center_id := coalesce(
    (new.raw_user_meta_data->>'center_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );

  insert into public.profiles (id, role, full_name, email, center_id)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new_center_id
  );

  insert into public.profile_center_access (profile_id, center_id)
  values (new.id, new_center_id)
  on conflict (profile_id, center_id) do nothing;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS: centers / profile_center_access
-- ----------------------------------------------------------------------------
alter table centers enable row level security;
alter table profile_center_access enable row level security;

create policy "centers are readable within accessible centers"
  on centers for select to authenticated using (public.has_center_access(id));
create policy "only admins can write centers"
  on centers for insert to authenticated with check (is_admin());
create policy "only admins can update centers"
  on centers for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can delete centers"
  on centers for delete to authenticated using (is_admin());

create policy "profile_center_access is readable by the profile or admins"
  on profile_center_access for select to authenticated using (profile_id = auth.uid() or is_admin());
create policy "only admins can grant center access"
  on profile_center_access for insert to authenticated with check (is_admin());
create policy "only admins can update center access grants"
  on profile_center_access for update to authenticated using (is_admin()) with check (is_admin());
create policy "only admins can revoke center access"
  on profile_center_access for delete to authenticated using (is_admin());

-- ----------------------------------------------------------------------------
-- RLS: profiles — center-scope the existing broad read policy, and extend
-- the F1 BOPLA fix (0017/0022) to pin the new center_id column too, so a
-- non-admin can't move themselves into another center's roster via a direct
-- API call. Self-read (id = auth.uid()) is kept unconditional so a brand
-- new signup can always read their own row even before anything else about
-- them is queried — it does not depend on profile_center_access.
-- ----------------------------------------------------------------------------
drop policy "profiles are readable by any authenticated user" on profiles;
create policy "profiles are readable within accessible centers"
  on profiles for select
  to authenticated
  using (id = auth.uid() or public.has_center_access(center_id));

drop policy "users can update their own profile" on profiles;
create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid() or is_admin())
  with check (
    is_admin()
    or (
      id = auth.uid()
      and role is not distinct from (select p.role from profiles p where p.id = auth.uid())
      and is_active is not distinct from (select p.is_active from profiles p where p.id = auth.uid())
      and archived_at is not distinct from (select p.archived_at from profiles p where p.id = auth.uid())
      and archived_by is not distinct from (select p.archived_by from profiles p where p.id = auth.uid())
      and title is not distinct from (select p.title from profiles p where p.id = auth.uid())
      and email is not distinct from (select p.email from profiles p where p.id = auth.uid())
      and date_of_birth is not distinct from (select p.date_of_birth from profiles p where p.id = auth.uid())
      and failed_login_attempts is not distinct from (select p.failed_login_attempts from profiles p where p.id = auth.uid())
      and must_change_password is not distinct from (select p.must_change_password from profiles p where p.id = auth.uid())
      and center_id is not distinct from (select p.center_id from profiles p where p.id = auth.uid())
    )
  );

drop policy "only admins can insert profiles directly" on profiles;
create policy "only admins can insert profiles directly"
  on profiles for insert
  to authenticated
  with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can delete profiles" on profiles;
create policy "only admins can delete profiles"
  on profiles for delete
  to authenticated
  using (is_admin() and public.has_center_access(center_id));

-- ----------------------------------------------------------------------------
-- RLS: classes / subjects — same center-scoping shape applied to both.
-- ----------------------------------------------------------------------------
drop policy "classes are readable by any authenticated user" on classes;
create policy "classes are readable within accessible centers"
  on classes for select to authenticated using (public.has_center_access(center_id));

drop policy "only admins can write classes" on classes;
create policy "only admins can write classes"
  on classes for insert to authenticated with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can update classes" on classes;
create policy "only admins can update classes"
  on classes for update to authenticated
  using (is_admin() and public.has_center_access(center_id))
  with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can delete classes" on classes;
create policy "only admins can delete classes"
  on classes for delete to authenticated using (is_admin() and public.has_center_access(center_id));

drop policy "subjects are readable by any authenticated user" on subjects;
create policy "subjects are readable within accessible centers"
  on subjects for select to authenticated using (public.has_center_access(center_id));

drop policy "only admins can write subjects" on subjects;
create policy "only admins can write subjects"
  on subjects for insert to authenticated with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can update subjects" on subjects;
create policy "only admins can update subjects"
  on subjects for update to authenticated
  using (is_admin() and public.has_center_access(center_id))
  with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can delete subjects" on subjects;
create policy "only admins can delete subjects"
  on subjects for delete to authenticated using (is_admin() and public.has_center_access(center_id));

-- ----------------------------------------------------------------------------
-- RLS: announcements / events — same center-scoping, layered on top of the
-- existing audience check (unchanged).
-- ----------------------------------------------------------------------------
drop policy "announcements are readable by matching audience" on announcements;
create policy "announcements are readable by matching audience"
  on announcements for select
  to authenticated
  using (public.has_center_access(center_id) and (audience = 'all' or audience = auth_role()::text or is_admin()));

drop policy "only admins can write announcements" on announcements;
create policy "only admins can write announcements"
  on announcements for insert to authenticated with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can update announcements" on announcements;
create policy "only admins can update announcements"
  on announcements for update to authenticated
  using (is_admin() and public.has_center_access(center_id))
  with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can delete announcements" on announcements;
create policy "only admins can delete announcements"
  on announcements for delete to authenticated using (is_admin() and public.has_center_access(center_id));

drop policy "events are readable by matching audience" on events;
create policy "events are readable by matching audience"
  on events for select to authenticated
  using (public.has_center_access(center_id) and (audience = 'all' or audience = auth_role()::text or is_admin()));

drop policy "only admins can write events" on events;
create policy "only admins can write events"
  on events for insert to authenticated with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can update events" on events;
create policy "only admins can update events"
  on events for update to authenticated
  using (is_admin() and public.has_center_access(center_id))
  with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can delete events" on events;
create policy "only admins can delete events"
  on events for delete to authenticated using (is_admin() and public.has_center_access(center_id));

-- ----------------------------------------------------------------------------
-- RLS: documents — same center-scoping, layered on top of the existing
-- "matching audience or the linked student" check (unchanged).
-- ----------------------------------------------------------------------------
drop policy "documents are readable by matching audience or the linked student" on documents;
create policy "documents are readable by matching audience or the linked student"
  on documents for select to authenticated using (
    public.has_center_access(center_id)
    and (
      is_admin()
      or student_id = auth.uid()
      or (student_id is null and (audience = 'all' or audience = auth_role()::text))
    )
  );

drop policy "only admins can write documents" on documents;
create policy "only admins can write documents"
  on documents for insert to authenticated with check (is_admin() and public.has_center_access(center_id));

drop policy "only admins can delete documents" on documents;
create policy "only admins can delete documents"
  on documents for delete to authenticated using (is_admin() and public.has_center_access(center_id));
