-- ============================================================================
-- Batch 4 of the backlog: parent portal, step 1 of 2.
--
-- Adding a value to an existing enum must be committed before it can be
-- referenced by any other statement in the same session — Postgres
-- disallows using a brand-new enum value inside the transaction that added
-- it. So this migration ONLY adds the enum value; run it, let it complete,
-- THEN run 0014_parent_portal.sql separately (same two-step process
-- documented for every other migration in this project — paste, run,
-- confirm, then move to the next file).
-- ============================================================================

alter type user_role add value if not exists 'parent';
