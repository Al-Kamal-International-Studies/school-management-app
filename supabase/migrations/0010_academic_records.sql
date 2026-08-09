-- ============================================================================
-- Batch 1 of the "more things a school app should have" backlog: daily
-- attendance, grades, assignments (+ submissions), exam/quiz scheduling,
-- teacher remarks, behaviour/discipline log, leave requests, and emergency
-- contact fields. Same conventions as prior migrations — security definer
-- helpers, class_subject_teachers ownership checks for teacher writes,
-- set_updated_at() reuse, plain-English policy names.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- attendance_records: one row per student per class per day.
-- ----------------------------------------------------------------------------
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  marked_by uuid not null references teachers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create index idx_attendance_student_id on attendance_records(student_id);
create index idx_attendance_class_id on attendance_records(class_id);
create index idx_attendance_date on attendance_records(date);

-- ----------------------------------------------------------------------------
-- assignments + submissions
-- ----------------------------------------------------------------------------
create table assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  title text not null,
  description text,
  due_date date not null,
  created_at timestamptz not null default now()
);

create index idx_assignments_class_id on assignments(class_id);
create index idx_assignments_due_date on assignments(due_date);

create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'graded')),
  submitted_at timestamptz,
  grade numeric(5,2),
  feedback text,
  unique (assignment_id, student_id)
);

create index idx_submissions_student_id on assignment_submissions(student_id);

-- ----------------------------------------------------------------------------
-- exams: exam/quiz schedule
-- ----------------------------------------------------------------------------
create table exams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  title text not null,
  exam_type text not null default 'exam' check (exam_type in ('exam', 'quiz')),
  exam_date date not null,
  start_time time,
  room text,
  created_at timestamptz not null default now()
);

create index idx_exams_class_id on exams(class_id);
create index idx_exams_date on exams(exam_date);

-- ----------------------------------------------------------------------------
-- grades: standalone marks entries (optionally linked to an exam)
-- ----------------------------------------------------------------------------
create table grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  exam_id uuid references exams(id) on delete set null,
  assessment_name text not null,
  marks_obtained numeric(6,2) not null,
  marks_total numeric(6,2) not null check (marks_total > 0),
  term text not null default 'Term 1',
  created_at timestamptz not null default now()
);

create index idx_grades_student_id on grades(student_id);

-- ----------------------------------------------------------------------------
-- teacher_remarks: freeform, timestamped observations (distinct from the
-- monthly progress system's single comment-per-month field)
-- ----------------------------------------------------------------------------
create table teacher_remarks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  remark text not null,
  created_at timestamptz not null default now()
);

create index idx_remarks_student_id on teacher_remarks(student_id);

-- ----------------------------------------------------------------------------
-- behaviour_log: pastoral/discipline tracking
-- ----------------------------------------------------------------------------
create table behaviour_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  category text not null check (category in ('positive', 'negative')),
  description text not null,
  created_at timestamptz not null default now()
);

create index idx_behaviour_student_id on behaviour_log(student_id);

-- ----------------------------------------------------------------------------
-- leave_requests: student-submitted, admin/teacher-reviewed
-- ----------------------------------------------------------------------------
create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  reason text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_leave_student_id on leave_requests(student_id);

-- ----------------------------------------------------------------------------
-- Emergency contact fields (additive, matches the existing guardian_* style)
-- ----------------------------------------------------------------------------
alter table students add column if not exists emergency_contact_name text;
alter table students add column if not exists emergency_contact_phone text;
alter table students add column if not exists emergency_contact_relationship text;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table attendance_records enable row level security;
alter table assignments enable row level security;
alter table assignment_submissions enable row level security;
alter table exams enable row level security;
alter table grades enable row level security;
alter table teacher_remarks enable row level security;
alter table behaviour_log enable row level security;
alter table leave_requests enable row level security;

-- attendance_records
create policy "students can view their own attendance"
  on attendance_records for select to authenticated using (student_id = auth.uid());
create policy "teachers can view attendance for classes they teach"
  on attendance_records for select to authenticated using (marked_by = auth.uid());
create policy "admins can view all attendance"
  on attendance_records for select to authenticated using (is_admin());
create policy "teachers can mark attendance for classes they teach"
  on attendance_records for insert to authenticated with check (
    marked_by = auth.uid()
    and exists (select 1 from class_subject_teachers cst where cst.class_id = attendance_records.class_id and cst.teacher_id = auth.uid())
  );
create policy "teachers can update attendance they marked"
  on attendance_records for update to authenticated using (marked_by = auth.uid()) with check (marked_by = auth.uid());

-- assignments
create policy "assignments readable by admin, the assigning teacher, and students in the class"
  on assignments for select to authenticated using (
    is_admin() or teacher_id = auth.uid()
    or exists (select 1 from students s where s.id = auth.uid() and s.class_id = assignments.class_id)
  );
create policy "teachers can create assignments for classes they teach"
  on assignments for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (select 1 from class_subject_teachers cst where cst.class_id = assignments.class_id and cst.subject_id = assignments.subject_id and cst.teacher_id = auth.uid())
  );
create policy "teachers can update their own assignments"
  on assignments for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "teachers can delete their own assignments"
  on assignments for delete to authenticated using (teacher_id = auth.uid());

-- assignment_submissions
create policy "submissions readable by admin, the student, and the assignment's teacher"
  on assignment_submissions for select to authenticated using (
    is_admin() or student_id = auth.uid()
    or exists (select 1 from assignments a where a.id = assignment_submissions.assignment_id and a.teacher_id = auth.uid())
  );
create policy "students can mark their own submission as submitted"
  on assignment_submissions for insert to authenticated with check (student_id = auth.uid());
create policy "assignment teacher can insert a submission to grade it"
  on assignment_submissions for insert to authenticated with check (
    exists (select 1 from assignments a where a.id = assignment_submissions.assignment_id and a.teacher_id = auth.uid())
  );
create policy "students can update their own pending submission"
  on assignment_submissions for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "assignment teacher can grade a submission"
  on assignment_submissions for update to authenticated using (
    exists (select 1 from assignments a where a.id = assignment_submissions.assignment_id and a.teacher_id = auth.uid())
  );

-- exams
create policy "exams are readable by any authenticated user"
  on exams for select to authenticated using (true);
create policy "teachers can create exams for classes they teach"
  on exams for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (select 1 from class_subject_teachers cst where cst.class_id = exams.class_id and cst.subject_id = exams.subject_id and cst.teacher_id = auth.uid())
  );
create policy "teachers can update their own exams"
  on exams for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "teachers can delete their own exams"
  on exams for delete to authenticated using (teacher_id = auth.uid());

-- grades
create policy "students can view their own grades"
  on grades for select to authenticated using (student_id = auth.uid());
create policy "teachers can view grades they recorded"
  on grades for select to authenticated using (teacher_id = auth.uid());
create policy "admins can view all grades"
  on grades for select to authenticated using (is_admin());
create policy "teachers can record grades for classes they teach"
  on grades for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (select 1 from class_subject_teachers cst where cst.class_id = grades.class_id and cst.subject_id = grades.subject_id and cst.teacher_id = auth.uid())
  );
create policy "teachers can update grades they recorded"
  on grades for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- teacher_remarks
create policy "students can view their own remarks"
  on teacher_remarks for select to authenticated using (student_id = auth.uid());
create policy "teachers can view remarks they wrote"
  on teacher_remarks for select to authenticated using (teacher_id = auth.uid());
create policy "admins can view all remarks"
  on teacher_remarks for select to authenticated using (is_admin());
create policy "teachers can write remarks for their own students"
  on teacher_remarks for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = teacher_remarks.student_id and cst.teacher_id = auth.uid()
    )
  );

-- behaviour_log
create policy "students can view their own behaviour log"
  on behaviour_log for select to authenticated using (student_id = auth.uid());
create policy "teachers can view behaviour entries they wrote"
  on behaviour_log for select to authenticated using (teacher_id = auth.uid());
create policy "admins can view all behaviour entries"
  on behaviour_log for select to authenticated using (is_admin());
create policy "teachers can log behaviour for their own students"
  on behaviour_log for insert to authenticated with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = behaviour_log.student_id and cst.teacher_id = auth.uid()
    )
  );

-- leave_requests
create policy "students can view their own leave requests"
  on leave_requests for select to authenticated using (student_id = auth.uid());
create policy "admins can view all leave requests"
  on leave_requests for select to authenticated using (is_admin());
create policy "teachers can view leave requests for their students"
  on leave_requests for select to authenticated using (
    exists (
      select 1 from students s join class_subject_teachers cst on cst.class_id = s.class_id
      where s.id = leave_requests.student_id and cst.teacher_id = auth.uid()
    )
  );
create policy "students can submit their own leave requests"
  on leave_requests for insert to authenticated with check (student_id = auth.uid());
create policy "admins can review leave requests"
  on leave_requests for update to authenticated using (is_admin()) with check (is_admin());
