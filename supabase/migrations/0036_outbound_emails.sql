-- ============================================================================
-- Durable email outbox. This project has no email provider wired up yet (no
-- nodemailer/resend/@sendgrid/mail/etc. installed, no working send path
-- anywhere except Supabase Auth's own default emails) — the Admissions
-- Digitization feature is the first thing that needs to actually email
-- someone outside the app (the new welcome email to a parent). Rather than
-- silently dropping that email or blocking the whole admissions flow on a
-- provider the client hasn't set up yet, every email is durably recorded
-- here first via src/lib/email/send.ts — see that file for the full
-- send-or-queue behavior.
--
-- Same "admin select only, no INSERT policy for authenticated" shape as
-- password_reset_requests (0023_password_reset_requests.sql): creation and
-- status updates happen only through the service-role client from
-- server-side code, so a user session — even an admin's own — can never
-- forge or tamper with an outbox entry via a direct API call.
--
-- related_table/related_id let an outbox row be traced back to whatever
-- queued it (e.g. 'admissions' + the admission id) without a hard foreign
-- key, since this table is meant to be a generic outbox usable by any
-- future feature, not admissions-specific.
-- ============================================================================

create table outbound_emails (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body_html text not null,
  body_text text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error text,
  related_table text,
  related_id uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index idx_outbound_emails_status on outbound_emails(status, created_at desc);
create index idx_outbound_emails_related on outbound_emails(related_table, related_id);

comment on table outbound_emails is 'Durable email outbox. Rows stay pending until a real provider (RESEND_API_KEY) is configured — see src/lib/email/send.ts.';

alter table outbound_emails enable row level security;

create policy "admins can view outbound emails"
  on outbound_emails for select to authenticated using (is_admin());

-- No insert/update/delete policy for authenticated/anon on purpose — see
-- banner comment above. Writes only ever happen via the service-role client
-- in src/lib/email/send.ts.
