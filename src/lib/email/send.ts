import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional trace-back link, e.g. { table: "admissions", id: admission.id }. */
  related?: { table: string; id: string };
}

/**
 * Provider-agnostic email sender for a project that doesn't have a real
 * email provider wired up yet (no nodemailer/resend/@sendgrid/mail/etc.
 * installed — see 0036_outbound_emails.sql's header comment).
 *
 * Behavior:
 *  1. ALWAYS durably records the email in `outbound_emails` first (status
 *     'pending'), via the service-role client. This insert is the one thing
 *     that must succeed for the email to not be silently lost — if it
 *     fails, this function throws, since there is then no record of the
 *     email anywhere.
 *  2. Only if `RESEND_API_KEY` is set does it then attempt a real send, via
 *     a plain `fetch()` POST to Resend's REST API (no SDK dependency —
 *     deliberately not adding `resend` or any other email package, see
 *     AGENTS.md/HANDOVER.md Part 12). On success the row is updated to
 *     'sent'; on failure (including a network error) it's updated to
 *     'failed' with the error message — but this function itself does NOT
 *     re-throw for a failed *send*, only for a failed *queue* (step 1),
 *     because the durable record already exists and an admin can always
 *     relay it manually from /admin/admissions (see the pending-emails
 *     panel there).
 *  3. If `RESEND_API_KEY` is not set (the expected state right now — no
 *     account has been created, per standing instruction never to sign up
 *     for or configure a paid/external service on the client's behalf),
 *     the row simply stays 'pending'. This is the intended honest
 *     fallback, not an error path.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const admin = createAdminClient();

  const { data: row, error: insertError } = await admin
    .from("outbound_emails")
    .insert({
      to_email: input.to,
      subject: input.subject,
      body_html: input.html,
      body_text: input.text,
      status: "pending",
      related_table: input.related?.table ?? null,
      related_id: input.related?.id ?? null,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    throw new Error(`Could not queue email: ${insertError?.message ?? "unknown error"}`);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Expected default state — no provider configured yet. Leave the row
    // 'pending' so an admin can relay it manually in the meantime.
    return;
  }

  // TODO: "onboarding@resend.dev" is Resend's own shared sandbox sender and
  // will not deliver to arbitrary recipients in production — the client
  // must replace ADMISSIONS_EMAIL_FROM with a real sender address on a
  // domain they've verified with Resend once they set up their own account.
  const from = process.env.ADMISSIONS_EMAIL_FROM || "Al Kamal Admissions <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Resend API responded ${response.status}: ${body.slice(0, 300)}`);
    }

    await admin.from("outbound_emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error sending email.";
    await admin.from("outbound_emails").update({ status: "failed", error: message }).eq("id", row.id);
    // Deliberately not re-thrown — see doc comment above.
  }
}
