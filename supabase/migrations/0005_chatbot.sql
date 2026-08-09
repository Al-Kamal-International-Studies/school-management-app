-- ============================================================================
-- In-app help chatbot. Two fixed personas (Muhammad / Sheikha), scoped to a
-- rule-based FAQ engine (see src/lib/chatbot/faq.ts) — no external API calls,
-- so no data ever leaves the app. Conversations are capped in application
-- code (see src/lib/chatbot/constants.ts) and enforced again here via a
-- trigger, so the cap holds even if someone calls the API directly.
-- ============================================================================

create table chatbot_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  persona text not null check (persona in ('muhammad', 'sheikha')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chatbot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chatbot_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_chatbot_conversations_user on chatbot_conversations(user_id);
create index idx_chatbot_messages_conversation on chatbot_messages(conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- Server-side enforcement of the message cap (defense in depth — the app
-- also stops showing the input once the limit is reached, but this trigger
-- means the limit holds even against a direct API call).
-- ----------------------------------------------------------------------------
create or replace function public.enforce_chatbot_message_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_message_count int;
begin
  if new.role = 'user' then
    select count(*) into user_message_count
    from chatbot_messages
    where conversation_id = new.conversation_id and role = 'user';

    if user_message_count >= 20 then
      raise exception 'conversation_limit_reached';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_chatbot_message_limit
  before insert on chatbot_messages
  for each row execute function public.enforce_chatbot_message_limit();

create trigger trg_chatbot_conversations_updated_at
  before update on chatbot_conversations
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — everyone can only ever see/write their own conversations & messages.
-- ----------------------------------------------------------------------------
alter table chatbot_conversations enable row level security;
alter table chatbot_messages enable row level security;

create policy "users can view their own conversations"
  on chatbot_conversations for select to authenticated using (user_id = auth.uid());
create policy "users can create their own conversations"
  on chatbot_conversations for insert to authenticated with check (user_id = auth.uid());
create policy "users can update their own conversations"
  on chatbot_conversations for update to authenticated using (user_id = auth.uid());
create policy "users can delete their own conversations"
  on chatbot_conversations for delete to authenticated using (user_id = auth.uid());

create policy "users can view messages in their own conversations"
  on chatbot_messages for select to authenticated using (
    exists (select 1 from chatbot_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
create policy "users can insert messages in their own conversations"
  on chatbot_messages for insert to authenticated with check (
    exists (select 1 from chatbot_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
