-- ============================================================================
-- Optional display title (e.g. "Director", "Administrator", "Principal")
-- shown instead of/alongside the generic role badge. Purely cosmetic —
-- does not affect permissions, which are still governed by `role`.
-- ============================================================================

alter table profiles add column if not exists title text;

update profiles set title = 'Director' where email = 'muhammad@alkamalinternational.com';
