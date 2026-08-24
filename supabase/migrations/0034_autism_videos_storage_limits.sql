-- ============================================================================
-- Security hardening, same reasoning as 0020_storage_upload_limits.sql:
-- server-enforced file type/size limits on the "autism-videos" Storage
-- bucket (created by 0033_autism_section.sql). The app-level checks in
-- uploadAutismVideoAction (autism/actions.ts) are for a friendly error
-- message only — the real, unbypassable enforcement is here, on the bucket
-- itself, which Supabase Storage applies regardless of how the upload
-- request was made (i.e. even a direct API call that skips the app
-- entirely still can't exceed these limits).
-- ============================================================================

update storage.buckets
set file_size_limit = 314572800, -- 300MB
    allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm']
where id = 'autism-videos';
