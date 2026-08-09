-- ============================================================================
-- Batch 3 of the backlog: controlled in-app direct messaging and Web Push
-- subscriptions. Messaging is deliberately NOT open peer-to-peer — the
-- can_message() helper only allows admin<->anyone, or a
-- teacher<->student pair that actually share a class, mirroring the
-- ownership checks used everywhere else in this schema.
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
      )
    );
$$;

create table dm_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references profiles(id) on delete cascade,
  participant_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (participant_a <> participant_b),
  unique (participant_a, participant_b)
);

create table dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references dm_conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_dm_messages_conversation on dm_messages(conversation_id, created_at);

create trigger trg_dm_conversations_updated_at
  before update on dm_conversations
  for each row execute function set_updated_at();

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_user_id on push_subscriptions(user_id);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table dm_conversations enable row level security;
alter table dm_messages enable row level security;
alter table push_subscriptions enable row level security;

create policy "users can view their own conversations"
  on dm_conversations for select to authenticated using (participant_a = auth.uid() or participant_b = auth.uid());
create policy "users can start a conversation with someone they're allowed to message"
  on dm_conversations for insert to authenticated with check (
    (participant_a = auth.uid() or participant_b = auth.uid())
    and can_message(participant_a, participant_b)
  );

create policy "users can view messages in their own conversations"
  on dm_messages for select to authenticated using (
    exists (select 1 from dm_conversations c where c.id = dm_messages.conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid()))
  );
create policy "users can send messages in their own conversations"
  on dm_messages for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (select 1 from dm_conversations c where c.id = dm_messages.conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid()))
  );

create policy "users can view their own push subscriptions"
  on push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "users can register their own push subscription"
  on push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "users can remove their own push subscription"
  on push_subscriptions for delete to authenticated using (user_id = auth.uid());
