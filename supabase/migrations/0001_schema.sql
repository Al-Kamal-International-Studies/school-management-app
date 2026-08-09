-- ============================================================================
-- School Management App — Phase 1 (MVP) schema
-- Auth, user profiles, classes/subjects, teacher assignments, timetable
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'teacher', 'student');

-- ----------------------------------------------------------------------------
-- profiles: one row per auth.users row, shared identity for all roles
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Shared identity row for every user, regardless of role.';

-- ----------------------------------------------------------------------------
-- classes: e.g. "Grade 9 - A"
-- ----------------------------------------------------------------------------
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section text not null,
  academic_year text not null default to_char(now(), 'YYYY'),
  homeroom_teacher_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name, section, academic_year)
);

-- ----------------------------------------------------------------------------
-- subjects
-- ----------------------------------------------------------------------------
create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- teachers: extra fields for profiles with role = 'teacher'
-- ----------------------------------------------------------------------------
create table teachers (
  id uuid primary key references profiles(id) on delete cascade,
  employee_id text not null unique,
  qualification text,
  joining_date date,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- students: extra fields for profiles with role = 'student'
-- ----------------------------------------------------------------------------
create table students (
  id uuid primary key references profiles(id) on delete cascade,
  enrollment_number text not null unique,
  class_id uuid references classes(id) on delete set null,
  date_of_birth date,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  address text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- class_subject_teachers: which teacher teaches which subject to which class
-- ----------------------------------------------------------------------------
create table class_subject_teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, subject_id)
);

-- ----------------------------------------------------------------------------
-- enrollments: which student is in which class, per academic year (historical)
-- ----------------------------------------------------------------------------
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  academic_year text not null,
  status text not null default 'active' check (status in ('active', 'transferred', 'completed')),
  enrolled_at timestamptz not null default now(),
  unique (student_id, academic_year)
);

-- ----------------------------------------------------------------------------
-- timetable_entries: weekly schedule per class
-- ----------------------------------------------------------------------------
create table timetable_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7), -- 1 = Monday .. 7 = Sunday
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index idx_students_class_id on students(class_id);
create index idx_enrollments_student_id on enrollments(student_id);
create index idx_enrollments_class_id on enrollments(class_id);
create index idx_cst_class_id on class_subject_teachers(class_id);
create index idx_cst_teacher_id on class_subject_teachers(teacher_id);
create index idx_timetable_class_id on timetable_entries(class_id);
create index idx_timetable_teacher_id on timetable_entries(teacher_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger for profiles
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth.users row is created.
-- Admin-created accounts pass role/full_name via user_metadata (see admin
-- server actions), so this trigger keeps profiles in sync automatically.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
