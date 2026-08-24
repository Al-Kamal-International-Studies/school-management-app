-- ============================================================================
-- Admissions Digitization (Part 12): an admin fills one long intake form
-- (personal info, both parents/guardians, address, medical history, informed
-- consent, payment-policy acknowledgment, plus an AKIS-only "Additional
-- Policies" acknowledgment) for either center. This table is the raw
-- source-of-truth submission — the thing that must never be lost — which is
-- why it is written FIRST, before any downstream step (PDF generation,
-- account creation, welcome email) runs, and why it is never deleted even if
-- those later steps fail (see createAdmissionAction/processAdmission in
-- src/app/(dashboard)/admin/admissions/actions.ts).
--
-- status lifecycle:
--   'pending'   — row just inserted, fulfillment (PDF + accounts + email)
--                 hasn't finished yet (briefly, mid-request, or "stuck" if a
--                 server crashed mid-processing — the admin can retry either).
--   'processed' — the PDF was generated, both the student and parent auth
--                 accounts were created, and the welcome email was queued.
--                 student_profile_id/parent_profile_id/pdf_file_path are all
--                 set at this point.
--   'failed'    — something in the fulfillment chain threw; `error` holds a
--                 human-readable reason. Any auth users created during that
--                 attempt are rolled back (see actions.ts), so a 'failed' row
--                 never leaves a half-created account behind — retrying is
--                 always safe to run from a clean slate.
--
-- RLS is admin-only, all operations — same shape as password_reset_requests
-- (0023_password_reset_requests.sql): this is internal admin-office data
-- (medical history, national ID numbers, parent contact info), not visible
-- to any other role, including the very student/parent it describes (they
-- get their own account instead, which exposes only what those roles are
-- normally allowed to see elsewhere in the schema).
-- ============================================================================

create table admissions (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id),
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  error text,

  -- Student
  student_full_name text not null,
  student_gender text not null check (student_gender in ('male', 'female')),
  student_dob date,
  student_id_number text, -- Emirates ID / Passport #
  student_religion text,
  student_nationality text,

  -- Father
  father_name text,
  father_job_title text,
  father_mobile text,
  father_email text,
  father_nationality text,

  -- Mother
  mother_name text,
  mother_job_title text,
  mother_mobile text,
  mother_email text,
  mother_nationality text,

  -- Residence address
  address_emirate text,
  address_area text,
  address_street text,
  address_building text,

  -- Medical history
  medical_conditions text,
  medical_vision boolean not null default false,
  medical_motor boolean not null default false,
  medical_hearing boolean not null default false,
  medical_balance boolean not null default false,
  medical_speech boolean not null default false,
  medical_allergies boolean not null default false,
  medical_allergies_detail text,

  -- Consent / policy acknowledgment. All required true to submit — enforced
  -- by the server action's zod schema (not just this check constraint),
  -- since a friendly per-field error beats a generic constraint-violation
  -- message. additional_policies_accepted is AKIS-only (nullable — always
  -- null for an AKET submission, see the header comment above).
  consent_accepted boolean not null,
  payment_policy_accepted boolean not null,
  additional_policies_accepted boolean,

  -- Center-specific extras — populate only the one matching `center_id`.
  enrolment_grade text, -- AKIS
  package_name text,    -- AKET

  registration_date date not null default current_date,
  created_by uuid not null references profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  -- Fulfillment linkage — all null until status = 'processed'.
  student_profile_id uuid references profiles(id) on delete set null,
  parent_profile_id uuid references profiles(id) on delete set null,
  pdf_file_path text -- key inside the private "admissions-pdfs" bucket
);

create index idx_admissions_status on admissions(status, created_at desc);
create index idx_admissions_center on admissions(center_id);

comment on table admissions is 'Raw admissions-intake submissions — the durable source of truth for PDF generation and account creation. Never deleted, even on a failed fulfillment attempt.';

alter table admissions enable row level security;

create policy "admins manage admissions"
  on admissions for all to authenticated
  using (is_admin()) with check (is_admin());

-- No policy for any other role — see header comment above.
