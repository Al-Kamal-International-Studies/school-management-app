-- ============================================================================
-- Private Storage bucket for admissions-generated PDFs (see
-- src/lib/admissions/generatePdf.ts / the admissions actions that upload to
-- it). Same shape as "documents"/"autism-videos": no public policies, all
-- access goes through the service-role client after an RLS-scoped check on
-- the `admissions` table itself (see getAdmissionPdfUrl.ts) — mirrors
-- getDocumentUrl.ts's two-step "RLS check, then service-role signed URL"
-- pattern.
--
-- file_size_limit/allowed_mime_types are set in the same insert (rather than
-- a follow-up migration like 0020_storage_upload_limits.sql did for
-- pre-existing buckets) since there's no pre-existing bucket here to patch —
-- this is a brand new one, so it can just be created correctly the first
-- time. PDF-only, 10MB ceiling (a generated form is at most a few hundred KB
-- even with an embedded logo; 10MB is a generous, matching the "documents"
-- bucket's own ceiling).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('admissions-pdfs', 'admissions-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
