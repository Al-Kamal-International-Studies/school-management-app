-- ============================================================================
-- Subject chat: a Google-Classroom-style "stream" per class+subject+teacher —
-- exactly the unit class_subject_teachers already models ("this subject, as
-- taught to this class, by this teacher"; see e.g. teacher/queries.ts's
-- listMyClasses and messages/queries.ts's listContactablePeople, which both
-- already treat a class_subject_teachers row as "one of this teacher's
-- classes"). The channel IS that row — cst.id doubles as the channel id, so
-- there's nothing new to keep in sync when a teacher assignment is created,
-- reassigned, or removed (the FK's `on delete cascade` takes the chat
-- history with it, same as every other child table in this schema).
--
-- Primary use case (per Muhammad, 2026-08-18): the teacher drops a link —
-- e.g. a Google Meet link for a live class — into the subject's chat, and
-- every student in that class can see it and join. General discussion is a
-- natural side effect of the same stream, so students can post too, same as
-- a Classroom stream's comments.
--
-- Deliberately excludes parents and admins from posting (no product ask for
-- either yet — see HANDOVER.md Part 7). Admins can still *read* any channel
-- for oversight, matching the is_admin() escape hatch already used on
-- announcements/events/documents (0007/0011/0021).
-- ============================================================================

create table subject_chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references class_subject_teachers(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index idx_subject_chat_messages_channel on subject_chat_messages(channel_id, created_at);

-- ----------------------------------------------------------------------------
-- is_subject_channel_member(): true if the current user is the teacher who
-- owns this channel, or a student currently enrolled (students.class_id,
-- the live/current assignment — same source of truth timetable_entries and
-- every grading table already join through) in its class. Same
-- "join through students -> class_subject_teachers" shape as the
-- teacher-write policies hardened in 0002_rls_policies.sql (see e.g.
-- grades' insert policy) — read-oriented and reused for both SELECT and
-- INSERT below, since a channel member is always allowed both.
-- ----------------------------------------------------------------------------
create or replace function public.is_subject_channel_member(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from class_subject_teachers cst
    where cst.id = p_channel_id
    and (
      cst.teacher_id = auth.uid()
      or exists (select 1 from students s where s.id = auth.uid() and s.class_id = cst.class_id)
    )
  );
$$;

alter table subject_chat_messages enable row level security;

create policy "channel members and admins can read subject chat messages"
  on subject_chat_messages for select to authenticated
  using (is_subject_channel_member(channel_id) or is_admin());

create policy "channel members can post subject chat messages"
  on subject_chat_messages for insert to authenticated with check (
    sender_id = auth.uid() and is_subject_channel_member(channel_id)
  );

-- No update/delete policy: messages are immutable once posted, same as
-- dm_messages and announcements — this app has no edit/delete history
-- story for chat-shaped tables anywhere yet, and subject chat doesn't need
-- to be the first.
