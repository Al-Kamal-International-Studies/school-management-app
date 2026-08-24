-- ============================================================================
-- Autism Section: a fully separate, AKET-only feature (see
-- src/lib/centers/constants.ts / AKET_CENTER_ID) where a teacher uploads
-- daily videos of an assigned student, the student's parent watches and
-- comments, the teacher replies, and every admin account has full read-only
-- visibility across the whole program.
--
-- Assignment model is DELIBERATELY a brand-new, admin-managed table
-- (autism_assignments), NOT layered onto class_subject_teachers/enrollments
-- — those model "this subject, in this class" (see 0031_subject_chat.sql's
-- own header comment for that shape), which has nothing to do with "this
-- teacher documents this specific student's day". A many-to-many pairing
-- table, managed exclusively by admins, is the honest model for that and
-- doesn't force AKET's program to fit AKIS's class/subject structure.
--
-- Admin visibility (product decision, Muhammad): every existing admin-role
-- account gets full read access automatically — no new "principal" tier.
-- Same is_admin() escape hatch already used everywhere else in this schema
-- (announcements/events/documents/subject_chat_messages).
--
-- Admin comment participation is VIEW-ONLY (product decision, Muhammad): an
-- admin can see every video and every thread, but cannot post into one —
-- only the assigned teacher and the student's parent can. This is enforced
-- by can_comment_on_autism_video() below deliberately NOT calling is_admin()
-- — read that function's own comment before ever "fixing" this to look more
-- symmetric with the read-side helper next to it; the asymmetry is the
-- point, not an oversight.
--
-- Unassignment semantics (product decision, Muhammad): reassigning a
-- student to a different teacher does NOT retroactively hide the outgoing
-- teacher's past videos/comments from anyone who could already see them —
-- history stays intact. Only *future* uploads/comments by that teacher for
-- that student are blocked, because is_autism_teacher_of() below reflects
-- the *current* autism_assignments row only. Past autism_videos rows keep
-- their own uploaded_by, so can_read_autism_video()'s
-- `v.uploaded_by = auth.uid()` clause alone still lets a since-unassigned
-- teacher read (not write to) their own historical uploads and threads.
-- ============================================================================

create table autism_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id)
);
create index idx_autism_assignments_teacher on autism_assignments(teacher_id);
create index idx_autism_assignments_student on autism_assignments(student_id);

create table autism_videos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  uploaded_by uuid not null references profiles(id) on delete set null,
  title text,
  file_path text not null, -- key inside the private "autism-videos" bucket
  mime_type text not null,
  file_size bigint not null,
  created_at timestamptz not null default now()
);
create index idx_autism_videos_student on autism_videos(student_id, created_at desc);

-- Flat, chronological per-video thread — same shape as subject_chat_messages
-- (0031_subject_chat.sql) and dm_messages: no edit/delete story, immutable
-- once posted.
create table autism_video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references autism_videos(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index idx_autism_video_comments_video on autism_video_comments(video_id, created_at);

-- ----------------------------------------------------------------------------
-- is_autism_teacher_of(): true only for the CURRENT assignment row — see the
-- unassignment-semantics note above for why this is intentionally "current
-- only", not "ever assigned".
-- ----------------------------------------------------------------------------
create or replace function public.is_autism_teacher_of(target_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from autism_assignments aa
    where aa.teacher_id = auth.uid() and aa.student_id = target_student_id
  );
$$;

-- ----------------------------------------------------------------------------
-- can_read_autism_video(): the uploader (even if since unassigned — history
-- stays intact, see header comment), the student's currently assigned
-- teacher, the student's parent, or any admin.
-- ----------------------------------------------------------------------------
create or replace function public.can_read_autism_video(target_video_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from autism_videos v
    where v.id = target_video_id
    and (
      v.uploaded_by = auth.uid()
      or public.is_autism_teacher_of(v.student_id)
      or public.is_parent_of(v.student_id)
      or public.is_admin()
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- can_comment_on_autism_video(): deliberately excludes is_admin() — admins
-- are view-only on comment threads per the product decision in the header
-- comment above. Only the student's currently assigned teacher or their
-- parent may post.
-- ----------------------------------------------------------------------------
create or replace function public.can_comment_on_autism_video(target_video_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from autism_videos v
    where v.id = target_video_id
    and (public.is_autism_teacher_of(v.student_id) or public.is_parent_of(v.student_id))
  );
$$;

alter table autism_assignments enable row level security;
alter table autism_videos enable row level security;
alter table autism_video_comments enable row level security;

create policy "admins manage autism assignments"
  on autism_assignments for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "teachers read their own autism assignments"
  on autism_assignments for select to authenticated
  using (teacher_id = auth.uid());

create policy "read accessible autism videos"
  on autism_videos for select to authenticated
  using (
    uploaded_by = auth.uid()
    or is_autism_teacher_of(student_id)
    or is_parent_of(student_id)
    or is_admin()
  );
create policy "assigned teachers upload autism videos"
  on autism_videos for insert to authenticated
  with check (uploaded_by = auth.uid() and is_autism_teacher_of(student_id));

create policy "read comments on accessible autism videos"
  on autism_video_comments for select to authenticated
  using (can_read_autism_video(video_id));
create policy "teacher or parent can comment on autism videos"
  on autism_video_comments for insert to authenticated
  with check (author_id = auth.uid() and can_comment_on_autism_video(video_id));

-- No update/delete policy on any of the three tables — same "immutable,
-- admin manages via the assignments table only" shape as subject_chat and
-- dm_messages; autism_assignments' "admins manage" policy above already
-- covers delete/update for reassignment via `for all`.

insert into storage.buckets (id, name, public)
values ('autism-videos', 'autism-videos', false)
on conflict (id) do nothing;
