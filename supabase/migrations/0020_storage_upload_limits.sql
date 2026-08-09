-- ============================================================================
-- Security hardening, batch 5: server-enforced file type/size limits on
-- Storage buckets (docs/SECURITY.md F12 + the input-validation checklist
-- item "file types and file sizes if uploads exist").
--
-- Both buckets already had SOME check, but only client-side (avatars —
-- AvatarUpload.tsx checks type/size in the browser before uploading) or
-- app-level-but-incomplete (documents — uploadDocumentAction checks size,
-- never type). Neither stops someone from calling
-- supabase.storage.from(bucket).upload() directly with an arbitrary
-- file, bypassing the app entirely. storage.buckets' own
-- file_size_limit/allowed_mime_types columns are enforced by Supabase
-- Storage itself, server-side, regardless of how the upload request was
-- made — the real fix, not a stronger app-side check layered on the same
-- bypassable foundation.
-- ============================================================================

update storage.buckets
set file_size_limit = 4194304, -- 4MB, matches AvatarUpload.tsx's existing client-side limit
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

update storage.buckets
set file_size_limit = 10485760, -- 10MB, matches uploadDocumentAction's existing limit
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'documents';
