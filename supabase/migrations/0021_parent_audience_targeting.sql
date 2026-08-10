-- ============================================================================
-- Closes the "announcements/events can't target parents" gap flagged in
-- HANDOVER_2 §19/§20 and docs/SECURITY.md Phase 2 roadmap. Not a security
-- fix — a product gap: the RLS policies on all three tables below already
-- handle any audience value generically (`audience = 'all' or audience =
-- auth_role()::text or is_admin()`, unchanged since 0007/0011), and
-- auth_role() already returns 'parent' correctly for a parent session
-- (user_role enum has included 'parent' since 0013_parent_role_enum.sql).
-- The only actual blocker was the CHECK constraint rejecting the value on
-- insert — this migration is the entire fix at the database layer.
--
-- Extended beyond just `announcements` to `events` and `documents` too:
-- both share the exact same audience column/constraint shape and the same
-- gap (verified while fixing announcements — documents in particular is a
-- real miss, since report cards/admit cards are exactly what a parent
-- audience option is for). Their admin forms, Server Action Zod schemas,
-- and the shared `AnnouncementAudience` TS type were all updated to match
-- in the same pass — see docs/SECURITY.md.
-- ============================================================================

alter table announcements drop constraint announcements_audience_check;
alter table announcements add constraint announcements_audience_check
  check (audience in ('all', 'teacher', 'student', 'parent'));

alter table events drop constraint events_audience_check;
alter table events add constraint events_audience_check
  check (audience in ('all', 'teacher', 'student', 'parent'));

alter table documents drop constraint documents_audience_check;
alter table documents add constraint documents_audience_check
  check (audience in ('all', 'teacher', 'student', 'parent'));
