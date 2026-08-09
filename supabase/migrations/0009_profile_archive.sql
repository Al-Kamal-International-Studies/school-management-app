-- ============================================================================
-- Soft-delete/archive support for accounts. "Permanently delete" in the
-- admin UI never runs a real DELETE on profiles — it sets archived_at (and
-- forces is_active = false), keeping the row and all its history intact for
-- audit purposes. Application queries filter `archived_at is null` for
-- default lists (see admin/users/queries.ts).
-- ============================================================================

alter table profiles add column if not exists archived_at timestamptz;
alter table profiles add column if not exists archived_by uuid references profiles(id) on delete set null;
