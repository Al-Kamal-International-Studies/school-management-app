-- ============================================================================
-- Lowers the "autism-videos" Storage bucket's real file_size_limit from
-- 300MB (0034_autism_videos_storage_limits.sql) to 150MB. 150MB is still
-- generous for a few minutes of real classroom video, and meaningfully
-- reduces load on the server for every upload. As with 0034/0020, this is
-- the real, unbypassable enforcement — the app-side MAX_VIDEO_BYTES check
-- in uploadAutismVideoAction (autism/actions.ts) only produces a friendly
-- early error; a direct API call that skips the app entirely is still
-- bound by this bucket-level limit.
-- ============================================================================

update storage.buckets
set file_size_limit = 157286400 -- 150MB
where id = 'autism-videos';
