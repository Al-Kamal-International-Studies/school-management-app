-- ============================================================================
-- admissions.created_by: allow NULL, as its own foreign key already intends
-- (HANDOVER Part 41).
--
-- 0035_admissions.sql declared it `not null references profiles(id) on delete
-- set null`, a contradiction: deleting any admin who ever created an admission
-- tried to set it to NULL and failed, so Supabase Auth refused to delete that
-- account ("Database error deleting user", found 2026-10-27 deleting an
-- archived admin). The app always sets created_by on insert (admissions
-- actions.ts) and the detail page already handles a NULL creator, so only the
-- constraint changes. The admission itself is kept when its creator is deleted.
-- Safe to re-run.
-- ============================================================================

alter table admissions alter column created_by drop not null;
