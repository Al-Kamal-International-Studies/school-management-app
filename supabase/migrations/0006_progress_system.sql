-- ============================================================================
-- Monthly student progress system. Teachers submit one entry per
-- student/subject/month; the "overall score" shown on dashboards is a plain
-- equal-weighted average of the six numeric fields below, computed in
-- application code (see src/lib/progress/calculate.ts) — not stored here, so
-- the weighting can change later without a data migration.
--
-- Note: `attendance_percentage` here is a teacher-entered monthly figure,
-- not a daily attendance log — a full attendance-record module is separate,
-- deferred backlog work.
-- ============================================================================

create table monthly_progress_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  month date not null,
  attendance_percentage numeric(5,2) not null check (attendance_percentage between 0 and 100),
  homework_completion numeric(5,2) not null check (homework_completion between 0 and 100),
  class_participation numeric(5,2) not null check (class_participation between 0 and 100),
  behaviour_conduct numeric(5,2) not null check (behaviour_conduct between 0 and 100),
  assessment_performance numeric(5,2) not null check (assessment_performance between 0 and 100),
  subject_understanding numeric(5,2) not null check (subject_understanding between 0 and 100),
  teacher_comments text,
  improvement_priority_areas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id, month)
);

create index idx_progress_student_id on monthly_progress_entries(student_id);
create index idx_progress_teacher_id on monthly_progress_entries(teacher_id);
create index idx_progress_class_id on monthly_progress_entries(class_id);
create index idx_progress_month on monthly_progress_entries(month);

create trigger trg_progress_updated_at
  before update on monthly_progress_entries
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: students read their own entries; teachers read/write entries for
-- classes+subjects they actually teach (checked against
-- class_subject_teachers, same ownership-via-exists pattern used for
-- chatbot_messages); admins read everything.
-- ----------------------------------------------------------------------------
alter table monthly_progress_entries enable row level security;

create policy "students can view their own progress entries"
  on monthly_progress_entries for select
  to authenticated
  using (student_id = auth.uid());

create policy "admins can view all progress entries"
  on monthly_progress_entries for select
  to authenticated
  using (is_admin());

create policy "teachers can view progress entries for classes they teach"
  on monthly_progress_entries for select
  to authenticated
  using (teacher_id = auth.uid());

create policy "teachers can insert progress entries for classes they teach"
  on monthly_progress_entries for insert
  to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from class_subject_teachers cst
      where cst.class_id = monthly_progress_entries.class_id
        and cst.subject_id = monthly_progress_entries.subject_id
        and cst.teacher_id = auth.uid()
    )
  );

create policy "teachers can update their own progress entries"
  on monthly_progress_entries for update
  to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "admins can delete progress entries"
  on monthly_progress_entries for delete
  to authenticated
  using (is_admin());
