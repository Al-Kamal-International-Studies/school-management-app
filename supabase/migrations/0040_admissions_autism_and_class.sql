-- ----------------------------------------------------------------------------
-- 0040_admissions_autism_and_class.sql
--
-- Two independent additions to the Admissions Digitization feature
-- (0035_admissions.sql), both requested directly against the live form:
--
-- 1. An "Is this child autistic?" toggle on the intake form, plus a set of
--    intake-only follow-up fields shown when it's checked. These are
--    deliberately NOT a clinical determination (no "type"/"severity" field
--    here) — per Muhammad's own description, that's decided later by an
--    in-person evaluation with the school's Autism Teacher present. What's
--    captured here is exactly the kind of background a parent can answer on
--    a form: prior diagnosis, current therapies, how the child communicates,
--    sensory/behavioural notes. `students.is_autistic` mirrors the same flag
--    onto the created account — this is the column app code gates the
--    Autism Section's visibility on (see the app-code fix that ships in the
--    same session, Sidebar.tsx / (dashboard)/autism/page.tsx), fixing a real
--    bug where every AKET parent saw the Autism Section regardless of
--    whether their own child was actually enrolled in that program.
--
--    The Autism Section (0033_autism_section.sql) is a confirmed AKET-only
--    program, so `is_autistic` on `admissions` is constrained to only ever
--    be true for AKET submissions — mirrors that product decision at the
--    database level instead of relying on the form to enforce it.
--
-- 2. A real Level/Grade selector at intake (`enrolment_class_id`, a genuine
--    FK to `classes`) so an admission can place the new student directly
--    into a class the moment the account is created — previously
--    `students.class_id` was always left null at intake ("an admin places
--    the student into a class manually later"), which is why a freshly
--    admitted student's own dashboard showed no class at all until a
--    second, separate manual step happened. `enrolment_grade` (the existing
--    free-text field, mirroring the paper form's own "Enrolment Grade"
--    label) is left untouched — it's a display label on the printed PDF,
--    not the same thing as actually being placed in a class.
-- ----------------------------------------------------------------------------

-- Also mirrors students.enrollment_number back onto the admissions row once
-- processAdmission succeeds (see actions.ts) — the PDF download filename
-- (AKIS/AKET + enrollment number + student name, per the client's own
-- request) needs it, and storing it here avoids an extra join to `students`
-- at download time on every click. Purely a denormalized copy; students.
-- enrollment_number stays the source of truth.
alter table admissions add column enrollment_number text;

alter table admissions
  add column is_autistic boolean not null default false,
  add column autism_diagnosed_before boolean not null default false,
  add column autism_diagnosis_date date,
  add column autism_diagnosed_by text,
  add column autism_current_support text,
  add column autism_communication_ability text,
  add column autism_sensory_notes text,
  add column autism_behavioral_notes text,
  add column autism_parent_notes text,
  add column enrolment_class_id uuid references classes(id) on delete set null;

-- AKET only, matching 0033_autism_section.sql's confirmed product decision.
-- '00000000-0000-0000-0000-000000000002' is AKET_CENTER_ID (0027_centers.sql
-- / src/lib/types/database.types.ts) — a literal here because check
-- constraints can't reference application constants, same convention this
-- migration set already follows in comments across this project.
alter table admissions
  add constraint admissions_autism_aket_only
  check (not is_autistic or center_id = '00000000-0000-0000-0000-000000000002');

comment on column admissions.is_autistic is 'Parent-reported at intake. Drives students.is_autistic on the created account, which the app gates Autism Section visibility on.';
comment on column admissions.enrolment_class_id is 'The class the student is placed into at account-creation time (see processAdmission in admissions/actions.ts). Distinct from enrolment_grade, which is only a printed-form label.';

-- ----------------------------------------------------------------------------
-- students.is_autistic — set once, at account creation, from the admission's
-- own is_autistic flag. Not editable elsewhere in this pass (no UI added to
-- flip it after the fact) — a future admin-edit surface can add that later
-- if ever needed; out of scope here.
-- ----------------------------------------------------------------------------
alter table students add column is_autistic boolean not null default false;
comment on column students.is_autistic is 'Set from admissions.is_autistic at account-creation time. Gates Autism Section (/autism) visibility for this student''s parent(s) — see Sidebar.tsx and (dashboard)/autism/page.tsx.';
