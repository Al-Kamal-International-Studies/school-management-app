-- ============================================================================
-- Chat oversight (HANDOVER Part 43). Muhammad, 2026-10-28: "Only make
-- muhammad@ be able to read all the private AND group chats. not principal@".
--
-- Before: every admin was a member of every subject group (0046's
-- is_group_member), and nobody could read other people's direct chats.
-- After:
--   * a chat OVERSEER (muhammad@ only) can read every direct chat and every
--     group, and post in groups. He cannot post into other people's direct
--     chats, and reading them leaves no receipts (mark_chat_read still
--     requires real membership), so nobody sees "read" from him.
--   * other admins (principal@) lose blanket group access. They can still
--     start a direct chat with anyone, as before.
--
-- Who is an overseer lives in its own table with RLS on and NO policies, so
-- no browser session can read or change it — not even an admin. (A column on
-- profiles would not do: admins may update any profile column, see 0027.)
-- Change it only with a migration or the service role.
-- ============================================================================

create table chat_overseers (
  user_id uuid primary key references profiles(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table chat_overseers enable row level security;

insert into chat_overseers (user_id)
select id from profiles where email = 'muhammad@alkamalinternational.com' and role = 'admin'
on conflict do nothing;

create or replace function public.is_chat_overseer(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from chat_overseers o join profiles p on p.id = o.user_id
    where o.user_id = p_user and p.role = 'admin' and p.is_active and p.archived_at is null
  );
$$;

-- Group membership: the overseer instead of every admin.
create or replace function public.is_group_member(p_cst_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_chat_overseer(p_user)
    or exists (
      select 1 from class_subject_teachers cst
      where cst.id = p_cst_id
      and (
        cst.teacher_id = p_user
        or exists (select 1 from students s where s.id = p_user and s.class_id = cst.class_id)
      )
    );
$$;

-- Reading: members, plus the overseer for everything.
drop policy "members can read their chats" on chats;
drop policy "members can read chat messages" on chat_messages;
drop policy "members can read chat receipts" on chat_receipts;
create policy "members and the overseer can read chats"
  on chats for select to authenticated
  using (public.is_chat_member(id, auth.uid()) or public.is_chat_overseer(auth.uid()));
create policy "members and the overseer can read chat messages"
  on chat_messages for select to authenticated
  using (public.is_chat_member(chat_id, auth.uid()) or public.is_chat_overseer(auth.uid()));
create policy "members and the overseer can read chat receipts"
  on chat_receipts for select to authenticated
  using (public.is_chat_member(chat_id, auth.uid()) or public.is_chat_overseer(auth.uid()));

-- Inbox: the overseer sees subject groups once they have messages (as admins
-- did before); his oversight of other people's direct chats is a separate
-- admin page, not his inbox.
create or replace function public.my_chats()
returns table (
  chat_id uuid,
  kind text,
  cst_id uuid,
  other_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid,
  unread integer
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as uid, public.is_chat_overseer(auth.uid()) as overseer
  )
  select c.id, c.kind, c.cst_id,
    case when c.kind = 'direct' then case when c.user_a = me.uid then c.user_b else c.user_a end end,
    c.last_message_at, c.last_message_preview, c.last_sender_id,
    (
      select count(*)::int from chat_messages m
      where m.chat_id = c.id and m.sender_id <> me.uid
      and m.created_at > coalesce((select r.read_up_to from chat_receipts r where r.chat_id = c.id and r.user_id = me.uid), '-infinity'::timestamptz)
    )
  from chats c, me
  where me.uid is not null
  and (
    (c.kind = 'direct' and me.uid in (c.user_a, c.user_b) and (c.last_message_at is not null or c.created_by = me.uid))
    or (c.kind = 'group' and public.is_group_member(c.cst_id, me.uid) and (not me.overseer or c.last_message_at is not null))
  )
  order by c.last_message_at desc nulls last;
$$;

-- mark_all_delivered(): the admin special case becomes the overseer.
create or replace function public.mark_all_delivered()
returns void
language sql
security definer
set search_path = public
as $$
  insert into chat_receipts (chat_id, user_id, delivered_up_to)
  select c.id, auth.uid(), c.last_message_at
  from chats c
  where auth.uid() is not null
  and c.last_message_at is not null
  and public.is_chat_member(c.id, auth.uid())
  and (c.kind = 'direct' or not public.is_chat_overseer(auth.uid())
       or exists (select 1 from chat_receipts r where r.chat_id = c.id and r.user_id = auth.uid()))
  on conflict (chat_id, user_id) do update
  set delivered_up_to = excluded.delivered_up_to
  where chat_receipts.delivered_up_to is null or chat_receipts.delivered_up_to < excluded.delivered_up_to;
$$;

revoke execute on function public.is_chat_overseer(uuid) from public, anon;
