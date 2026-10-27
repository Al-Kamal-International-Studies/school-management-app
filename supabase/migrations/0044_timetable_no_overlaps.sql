-- ============================================================================
-- Timetable clashes become impossible at the database level (HANDOVER Part 41).
--
-- Muhammad, chat, 2026-10-27: "when there are clashes between timings or
-- classes or overriding class schedules, that there can't be any. Meaning,
-- same class, 2 different teachers, trying to take a slot at the same time.
-- Make it so that does not happen."
--
-- builderActions.ts already refused overlapping periods, but only as a
-- read-then-insert check in the app: two people saving at the same moment
-- could both pass it. These two exclusion constraints make Postgres itself
-- reject any period that overlaps another period
--   1. of the SAME CLASS on the same day   (one class, two lessons at once), or
--   2. of the SAME TEACHER on the same day (one teacher, two classes at once),
-- for inserts AND edits, from any client. Periods that merely touch
-- (08:00–08:45 then 08:45–09:30) are allowed: the ranges are half-open '[)'.
--
-- A `time` has no range type, so each period is mapped onto a fixed dummy
-- date (date + time = timestamp, an immutable expression) to get a tsrange.
-- btree_gist lets the uuid/smallint equality columns share the GiST index.
--
-- Fails (and changes nothing) if overlapping rows already exist: clean those
-- up first. Safe to re-run.
-- ============================================================================

create extension if not exists btree_gist with schema extensions;

alter table timetable_entries drop constraint if exists timetable_no_class_overlap;
alter table timetable_entries
  add constraint timetable_no_class_overlap
  exclude using gist (
    class_id with =,
    day_of_week with =,
    tsrange(date '2000-01-01' + start_time, date '2000-01-01' + end_time, '[)') with &&
  );

alter table timetable_entries drop constraint if exists timetable_no_teacher_overlap;
alter table timetable_entries
  add constraint timetable_no_teacher_overlap
  exclude using gist (
    teacher_id with =,
    day_of_week with =,
    tsrange(date '2000-01-01' + start_time, date '2000-01-01' + end_time, '[)') with &&
  );
