-- ============================================================================
-- Give teachers the exact same timetable-building access admins have.
--
-- Muhammad, chat, 2026-09-09: "I want you to give the teachers the exact
-- same access for creating timetables that the admins have. So that the
-- teachers are able to create the timetables." Previously timetable_entries
-- insert/update/delete was admin-only (0002_rls_policies.sql); this widens
-- those three policies to admin OR teacher, matching a plain "any teacher,
-- any class" grant rather than restricting a teacher to only their own
-- classes — the same unrestricted shape the admin builder page already has.
--
-- The app-level gate (createTimetableEntryAction/deleteTimetableEntryAction,
-- src/lib/timetable/builderActions.ts) is changed alongside this migration
-- to requireRole("admin", "teacher"); this RLS change is the defense-in-depth
-- layer behind it, same relationship every other admin-write policy in
-- 0002_rls_policies.sql has to requireRole("admin") in its own action.
-- ============================================================================

drop policy "only admins can write timetable" on timetable_entries;
create policy "admins and teachers can write timetable"
  on timetable_entries for insert to authenticated
  with check (auth_role() in ('admin', 'teacher'));

drop policy "only admins can update timetable" on timetable_entries;
create policy "admins and teachers can update timetable"
  on timetable_entries for update to authenticated
  using (auth_role() in ('admin', 'teacher'))
  with check (auth_role() in ('admin', 'teacher'));

drop policy "only admins can delete timetable" on timetable_entries;
create policy "admins and teachers can delete timetable"
  on timetable_entries for delete to authenticated
  using (auth_role() in ('admin', 'teacher'));
