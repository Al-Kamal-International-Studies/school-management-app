-- ============================================================================
-- feedback.center_id — closing a scoping gap 0027_centers.sql deliberately
-- left open, whose reasoning turns out to have been wrong for this one
-- table.
--
-- 0027_centers.sql's own header comment listed `feedback` among the tables
-- judged reachable indirectly via a user_id -> profiles.id join, so it was
-- deliberately NOT given its own center_id column at the time. That
-- reasoning holds for most of those tables (attendance_records, grades,
-- assignments, ...) because their RLS is scoped to the acting user's own
-- rows (a teacher's own class, a student's own record) — a join through
-- user_id/class_id back to profiles is enough to keep one center's data
-- from leaking into another's view.
--
-- feedback is different, and this is the confirmed, sole root cause of the
-- reported bug (Muhammad: "The Feedback Inbox is connected for both AKIS
-- and AKET. It's the same for both"): the admin-read policy on `feedback`
-- (0008_feedback.sql) grants ANY admin unconditional read access via
-- `is_admin()` alone, with no join back to the submitting user's center at
-- all — unlike, say, documents/announcements/events, which check
-- has_center_access(center_id) directly, or the ~12 tables in 0027's
-- "deliberately not scoped" list whose RLS is at least self-scoped to
-- auth.uid()'s own rows. Nothing in feedback's admin policies ever looked
-- at which center either the admin or the feedback row belonged to, so an
-- AKET admin saw AKIS's whole inbox and vice versa. The admin *write*
-- policy ("only admins can update feedback status") has the exact same gap
-- and is fixed here too, for the same reason — leaving it open would mean
-- an AKET admin who somehow obtained an AKIS feedback row's id (e.g. by
-- guessing/enumerating in a direct API call — the same class of concern
-- 0017_close_bopla_gaps.sql's F10 note flags for this table) could still
-- change its status, even after losing the ability to see it in the inbox.
--
-- A join-through-user_id fix to the policies would also work, but a direct
-- center_id column matches the exact pattern this app already uses for
-- every other admin-inbox-style table (announcements, events, documents in
-- 0027_centers.sql) and is simpler to reason about, filter, and index.
--
-- Same fixed-UUID/backfill/NOT NULL shape as every column 0027_centers.sql
-- added: DEFAULT to AKIS's fixed id (00000000-0000-0000-0000-000000000001,
-- see 0027_centers.sql's header comment for why a fixed literal rather than
-- gen_random_uuid()) so every existing feedback row — all of it AKIS's,
-- submitted before AKET existed — keeps exactly the access it has today,
-- then an explicit UPDATE (defensive, in case any row landed between the
-- ADD COLUMN and the SET NOT NULL on a live database), then NOT NULL, then
-- an index. No existing feedback row's visibility to its own submitter
-- changes as a result of this migration.
-- ============================================================================

alter table feedback add column center_id uuid references centers(id) default '00000000-0000-0000-0000-000000000001';
update feedback set center_id = '00000000-0000-0000-0000-000000000001' where center_id is null;
alter table feedback alter column center_id set not null;
create index idx_feedback_center_id on feedback(center_id);

-- ----------------------------------------------------------------------------
-- RLS — scoped strictly to feedback; no other table's policies are touched
-- by this migration.
--
-- The user's-own-feedback paths (user_id = auth.uid()) need no center check
-- at all, same reasoning 0027_centers.sql used to keep profiles' self-read
-- (id = auth.uid()) unconditional: a user's own submitted feedback is
-- always theirs to read regardless of which center it belongs to, so only
-- the admin-facing branch of the read policy gets
-- public.has_center_access(center_id) added.
-- ----------------------------------------------------------------------------

drop policy "users can view their own feedback" on feedback;
create policy "users can view their own feedback"
  on feedback for select
  to authenticated
  using (user_id = auth.uid() or (is_admin() and public.has_center_access(center_id)));

drop policy "only admins can update feedback status" on feedback;
create policy "only admins can update feedback status"
  on feedback for update
  to authenticated
  using (is_admin() and public.has_center_access(center_id))
  with check (is_admin() and public.has_center_access(center_id));

-- "users can submit their own feedback" (insert, redefined in
-- 0017_close_bopla_gaps.sql) is deliberately left untouched: user_id =
-- auth.uid() and status = 'new' already fully governs who can insert what,
-- and center_id is set by the application
-- (src/app/(dashboard)/feedback/actions.ts) from the submitting user's own
-- profile.center_id, not chosen by the client — there is no unscoped-write
-- gap here to close, and adding a center check to a purely self-scoped
-- policy would be an unnecessary check with no security benefit.
