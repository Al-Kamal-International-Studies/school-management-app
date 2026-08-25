"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/security/rateLimit";
import { generatePassword } from "@/lib/security/generatePassword";
import { generateAdmissionPdf, type AdmissionCenter } from "@/lib/admissions/generatePdf";
import { sendEmail } from "@/lib/email/send";
import { setAccountBanned } from "@/lib/auth/accountAccess";
import { AKIS_CENTER_ID, AKET_CENTER_ID, type Admission } from "@/lib/types/database.types";

export interface ActionState {
  error?: string;
}

const optional = () => z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined));
const optionalEmail = (message: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, message);

const admissionSchema = z.object({
  center: z.enum(["AKIS", "AKET"], { message: "Choose a center." }),

  student_full_name: z.string().min(2, "Student full name is required."),
  student_gender: z.enum(["male", "female"], { message: "Choose the student's gender." }),
  student_dob: optional(),
  student_id_number: optional(),
  student_religion: optional(),
  student_nationality: optional(),

  father_name: optional(),
  father_job_title: optional(),
  father_mobile: optional(),
  father_email: optionalEmail("Enter a valid father's email address."),
  father_nationality: optional(),

  mother_name: optional(),
  mother_job_title: optional(),
  mother_mobile: optional(),
  mother_email: optionalEmail("Enter a valid mother's email address."),
  mother_nationality: optional(),

  address_emirate: optional(),
  address_area: optional(),
  address_street: optional(),
  address_building: optional(),

  medical_conditions: optional(),
  medical_allergies_detail: optional(),

  enrolment_grade: optional(),
  package_name: optional(),
  enrolment_class_id: optional(),

  // Autism intake fields — collected only when is_autistic is checked (see
  // AdmissionForm.tsx). Deliberately not a clinical determination; see
  // 0040_admissions_autism_and_class.sql's header comment.
  autism_diagnosis_date: optional(),
  autism_diagnosed_by: optional(),
  autism_current_support: optional(),
  autism_communication_ability: optional(),
  autism_sensory_notes: optional(),
  autism_behavioral_notes: optional(),
  autism_parent_notes: optional(),
});

/**
 * Every admissions form email/mobile field, plus the checkbox fields, are
 * read straight off `formData` (not through the zod object above) because
 * an unchecked HTML checkbox sends no key at all — `formData.get(...)` and
 * an explicit `=== "on"` comparison is this codebase's existing pattern
 * (see src/app/login/actions.ts's `remember` flag).
 */
function readCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export async function createAdmissionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");

  // Keyed by the acting admin — same reasoning as createUserAction's own
  // rate limit (protects against a compromised/malicious admin session mass
  // -creating admissions, not against normal front-office pace).
  const bucket = `create_admission:${me.id}`;
  const { limited } = await checkRateLimit(bucket, { maxAttempts: 20, windowSeconds: 60 * 60 });
  if (limited) return { error: "Too many admissions submitted recently. Wait a while before submitting more." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = admissionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  const data = parsed.data;

  const consentAccepted = readCheckbox(formData, "consent_accepted");
  const paymentPolicyAccepted = readCheckbox(formData, "payment_policy_accepted");
  const additionalPoliciesAccepted = readCheckbox(formData, "additional_policies_accepted");

  if (!consentAccepted) return { error: "The informed consent acknowledgment is required." };
  if (!paymentPolicyAccepted) return { error: "The payment policy acknowledgment is required." };
  if (data.center === "AKIS" && !additionalPoliciesAccepted) {
    return { error: "The additional policies acknowledgment is required for AKIS." };
  }

  // Autism Section is AKET-only (0033_autism_section.sql's confirmed product
  // decision, mirrored as a DB check constraint in
  // 0040_admissions_autism_and_class.sql) — AdmissionForm.tsx already hides
  // the toggle entirely for AKIS, but the server action must not trust that;
  // if a spoofed/replayed AKIS submission somehow sets it, fail cleanly
  // here rather than letting the insert hit the DB constraint and turn into
  // an opaque "Could not save the admission" error.
  const isAutistic = data.center === "AKET" && readCheckbox(formData, "is_autistic");
  if (readCheckbox(formData, "is_autistic") && data.center === "AKIS") {
    return { error: "The Autism Section is only available for AKET admissions." };
  }

  const admin = createAdminClient();
  const centerId = data.center === "AKIS" ? AKIS_CENTER_ID : AKET_CENTER_ID;

  // Step 2 of the spec: the raw submission is saved FIRST, durably, before
  // any PDF generation / account creation / email is even attempted — see
  // 0035_admissions.sql's header comment. This insert is the only step in
  // the whole flow that, if it fails, should actually be reported back to
  // the admin as "nothing happened" (everything after this point always
  // succeeds in saving *something*, even a 'failed' status + error message).
  const { data: inserted, error: insertError } = await admin
    .from("admissions")
    .insert({
      center_id: centerId,
      status: "pending",
      student_full_name: data.student_full_name,
      student_gender: data.student_gender,
      student_dob: data.student_dob ?? null,
      student_id_number: data.student_id_number ?? null,
      student_religion: data.student_religion ?? null,
      student_nationality: data.student_nationality ?? null,
      father_name: data.father_name ?? null,
      father_job_title: data.father_job_title ?? null,
      father_mobile: data.father_mobile ?? null,
      father_email: data.father_email ?? null,
      father_nationality: data.father_nationality ?? null,
      mother_name: data.mother_name ?? null,
      mother_job_title: data.mother_job_title ?? null,
      mother_mobile: data.mother_mobile ?? null,
      mother_email: data.mother_email ?? null,
      mother_nationality: data.mother_nationality ?? null,
      address_emirate: data.address_emirate ?? null,
      address_area: data.address_area ?? null,
      address_street: data.address_street ?? null,
      address_building: data.address_building ?? null,
      medical_conditions: data.medical_conditions ?? null,
      medical_vision: readCheckbox(formData, "medical_vision"),
      medical_motor: readCheckbox(formData, "medical_motor"),
      medical_hearing: readCheckbox(formData, "medical_hearing"),
      medical_balance: readCheckbox(formData, "medical_balance"),
      medical_speech: readCheckbox(formData, "medical_speech"),
      medical_allergies: readCheckbox(formData, "medical_allergies"),
      medical_allergies_detail: data.medical_allergies_detail ?? null,
      consent_accepted: consentAccepted,
      payment_policy_accepted: paymentPolicyAccepted,
      additional_policies_accepted: data.center === "AKIS" ? additionalPoliciesAccepted : null,
      enrolment_grade: data.center === "AKIS" ? (data.enrolment_grade ?? null) : null,
      package_name: data.center === "AKET" ? (data.package_name ?? null) : null,
      enrolment_class_id: data.enrolment_class_id ?? null,
      is_autistic: isAutistic,
      autism_diagnosed_before: isAutistic && readCheckbox(formData, "autism_diagnosed_before"),
      autism_diagnosis_date: isAutistic ? (data.autism_diagnosis_date ?? null) : null,
      autism_diagnosed_by: isAutistic ? (data.autism_diagnosed_by ?? null) : null,
      autism_current_support: isAutistic ? (data.autism_current_support ?? null) : null,
      autism_communication_ability: isAutistic ? (data.autism_communication_ability ?? null) : null,
      autism_sensory_notes: isAutistic ? (data.autism_sensory_notes ?? null) : null,
      autism_behavioral_notes: isAutistic ? (data.autism_behavioral_notes ?? null) : null,
      autism_parent_notes: isAutistic ? (data.autism_parent_notes ?? null) : null,
      created_by: me.id,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: `Could not save the admission: ${insertError?.message ?? "unknown error"}` };
  }

  await recordRateLimitAttempt(bucket);

  // Steps 3-9 (account creation, PDF, email) — failures here are recorded
  // on the admissions row itself (status 'failed' + error) rather than
  // losing the submission or blocking the admin from seeing what happened;
  // see processAdmission's own doc comment and the [id] detail page's Retry
  // button.
  try {
    await processAdmission(inserted.id, me.id);
  } catch {
    // Already recorded on the row by processAdmission — nothing further to
    // do here. Still send the admin to the detail page so they can see the
    // error and retry.
  }

  revalidatePath("/admin/admissions");
  redirect(`/admin/admissions/${inserted.id}`);
}

/**
 * Re-runs steps 3-9 (account creation, PDF, email) for an existing
 * admission row without touching the row's already-saved submission data.
 * Safe to call on a 'failed' row (the normal case) or a 'pending' row
 * stuck mid-processing (e.g. the server crashed): every failure path in
 * processAdmission rolls back any auth users it created during THAT
 * attempt before marking the row 'failed' again, so there is never a
 * half-created account left over to collide with a retry.
 */
export async function retryAdmissionProcessingAction(admissionId: string): Promise<{ error?: string }> {
  const me = await requireRole("admin");

  const admin = createAdminClient();
  const { data: admission } = await admin.from("admissions").select("id, status").eq("id", admissionId).single();
  if (!admission) return { error: "Admission not found." };
  if (admission.status === "processed") return { error: "This admission has already been processed." };

  try {
    await processAdmission(admissionId, me.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Retry failed." };
  }

  revalidatePath("/admin/admissions");
  revalidatePath(`/admin/admissions/${admissionId}`);
  return {};
}

/**
 * Deletes an admission record — the "no option to delete an admission" gap.
 * Two different things happen underneath, deliberately not the same
 * operation:
 *
 *  - The `admissions` intake row itself (plus its generated PDF in Storage
 *    and any queued outbound_emails tied to it) is genuinely, permanently
 *    removed. It's just a stale/duplicate/mistaken form submission, not a
 *    person's account or history.
 *  - If the admission had already created a student and/or parent LOGIN,
 *    those accounts are archived, not hard-deleted — the exact same
 *    reversible effect adminUsers' own "Permanently Delete" button already
 *    uses everywhere else in this app (is_active = false, banned at the
 *    Supabase Auth level so sign-in is genuinely blocked, audit-logged) —
 *    see ArchiveUserButton.tsx / archiveUserAction and dict.deletion's own
 *    copy, which is already explicit that this app's "permanent delete"
 *    means "archived and access-revoked, not erased." Their academic
 *    records (attendance, grades, etc., if any exist by the time this
 *    runs) survive intact for the institution's own continuity, exactly
 *    like every other archived account in this app — access is what gets
 *    permanently removed, not history.
 */
export async function deleteAdmissionAction(admissionId: string): Promise<{ error?: string }> {
  const me = await requireRole("admin");

  const bucket = `delete_admission:${me.id}`;
  const { limited } = await checkRateLimit(bucket, { maxAttempts: 20, windowSeconds: 60 * 60 });
  if (limited) return { error: "Too many admissions deleted recently. Wait a while before deleting more." };

  const admin = createAdminClient();
  const { data: admission } = await admin
    .from("admissions")
    .select("id, student_full_name, center_id, pdf_file_path, student_profile_id, parent_profile_id")
    .eq("id", admissionId)
    .single();
  if (!admission) return { error: "Admission not found." };

  for (const linkedId of [admission.student_profile_id, admission.parent_profile_id]) {
    if (!linkedId) continue;
    await admin
      .from("profiles")
      .update({ is_active: false, archived_at: new Date().toISOString(), archived_by: me.id })
      .eq("id", linkedId);
    await setAccountBanned(linkedId, true);
  }

  if (admission.pdf_file_path) {
    await admin.storage.from("admissions-pdfs").remove([admission.pdf_file_path]);
  }
  await admin.from("outbound_emails").delete().eq("related_table", "admissions").eq("related_id", admissionId);

  const { error: deleteError } = await admin.from("admissions").delete().eq("id", admissionId);
  if (deleteError) return { error: `Could not delete the admission: ${deleteError.message}` };

  await recordRateLimitAttempt(bucket);
  await logAuditEvent(me.id, "delete_admission", "admissions", admissionId, {
    center_id: admission.center_id,
    student_full_name: admission.student_full_name,
    archived_student_profile_id: admission.student_profile_id,
    archived_parent_profile_id: admission.parent_profile_id,
  });

  revalidatePath("/admin/admissions");
  return {};
}

function centerOf(admission: Admission): AdmissionCenter {
  return admission.center_id === AKIS_CENTER_ID ? "akis" : "aket";
}

function assembleAddress(admission: Admission): string | null {
  const parts = [admission.address_building, admission.address_street, admission.address_area, admission.address_emirate].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

/** a.b.c -> "abc" (lowercase, non-alphanumeric stripped) — see synthesizeStudentEmail. */
function cleanToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Synthesizes a student login email — the paper form never collects one
 * (young students won't check their own inbox anyway). Format matches the
 * existing staff-account convention seen in scripts/bulk-onboard*.mjs:
 * firstname.lastname@<center-domain>, lowercased, non-alphanumeric
 * stripped, with a ".2", ".3", ... suffix appended on collision.
 */
async function synthesizeStudentEmail(
  admin: ReturnType<typeof createAdminClient>,
  fullName: string,
  center: AdmissionCenter
): Promise<string> {
  const domain = center === "akis" ? "alkamalinternational.com" : "alkamaleducation.com";
  const tokens = fullName.trim().split(/\s+/).map(cleanToken).filter(Boolean);
  const base = tokens.length >= 2 ? `${tokens[0]}.${tokens[tokens.length - 1]}` : tokens[0] || "student";

  let candidate = `${base}@${domain}`;
  let suffix = 2;
  while (true) {
    const { data: existing } = await admin.from("profiles").select("id").eq("email", candidate).maybeSingle();
    if (!existing) return candidate;
    candidate = `${base}.${suffix}@${domain}`;
    suffix += 1;
  }
}

/** AD-<year>-<5 random alphanumeric chars>, checked against students.enrollment_number for uniqueness. */
async function generateEnrollmentNumber(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const year = new Date().getFullYear();
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  while (true) {
    const suffix = Array.from({ length: 5 }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
    const candidate = `AD-${year}-${suffix}`;
    const { data: existing } = await admin.from("students").select("id").eq("enrollment_number", candidate).maybeSingle();
    if (!existing) return candidate;
  }
}

function welcomeEmailBody(opts: {
  center: AdmissionCenter;
  studentName: string;
  studentEmail: string;
  studentPassword: string;
  parentEmail: string;
  parentPassword: string;
}) {
  const schoolName = opts.center === "akis" ? "Al Kamal International Studies" : "Al Kamal Education Technology";
  const text = `Welcome to ${schoolName}!

We're delighted to confirm ${opts.studentName}'s registration. Two accounts have been created for your family so you can both use the app right away:

Student account
  Email: ${opts.studentEmail}
  Temporary password: ${opts.studentPassword}

Parent account (yours)
  Email: ${opts.parentEmail}
  Temporary password: ${opts.parentPassword}

Getting started is simple: sign in with either account above, and you'll be asked to choose your own new password right away. After that, a short guided tour will walk you through everything the app can do.

Both passwords above are temporary and must be changed the first time you sign in — please don't share them by forwarding this email on. If you have any trouble signing in, contact the school office and we'll be glad to help.

Welcome to the family!
${schoolName}`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a2e;max-width:560px;margin:0 auto;">
  <h2 style="color:#0b1b3d;margin-bottom:4px;">Welcome to ${schoolName}!</h2>
  <p>We're delighted to confirm <strong>${opts.studentName}</strong>'s registration. Two accounts have been created for your family so you can both use the app right away:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="padding:12px;border:1px solid #d9dce3;border-radius:6px;">
        <strong>Student account</strong><br/>
        Email: ${opts.studentEmail}<br/>
        Temporary password: <code>${opts.studentPassword}</code>
      </td>
    </tr>
    <tr><td style="height:10px;"></td></tr>
    <tr>
      <td style="padding:12px;border:1px solid #d9dce3;border-radius:6px;">
        <strong>Parent account (yours)</strong><br/>
        Email: ${opts.parentEmail}<br/>
        Temporary password: <code>${opts.parentPassword}</code>
      </td>
    </tr>
  </table>
  <p>Getting started is simple: sign in with either account above, and you'll be asked to choose your own new password right away. After that, a short guided tour will walk you through everything the app can do.</p>
  <p><strong>Both passwords above are temporary</strong> and must be changed the first time you sign in — please don't share them by forwarding this email on. If you have any trouble signing in, contact the school office and we'll be glad to help.</p>
  <p>Welcome to the family!<br/>${schoolName}</p>
</div>`;

  return { html, text };
}

/**
 * Runs the account-creation / PDF / email fulfillment chain (spec steps
 * 3-9) for an already-saved `admissions` row. Used by both
 * createAdmissionAction (right after inserting the row) and
 * retryAdmissionProcessingAction (re-running it later).
 *
 * On any failure: rolls back any auth users created during THIS call only
 * (never touches a previous attempt's already-rolled-back state), records
 * `status = 'failed'` + a human-readable `error` on the admissions row, and
 * re-throws so the caller can decide how to surface it. On success, marks
 * `status = 'processed'` with the linkage columns filled in and writes the
 * one audit-log entry for this admission's account creation.
 */
async function processAdmission(admissionId: string, actorId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: admission, error: fetchError } = await admin.from("admissions").select("*").eq("id", admissionId).single();
  if (fetchError || !admission) throw new Error("Admission not found.");

  const center = centerOf(admission);
  const createdUserIds: string[] = [];

  try {
    const parentEmail = admission.father_email || admission.mother_email;
    if (!parentEmail) throw new Error("Provide at least one parent email.");
    const parentName = (admission.father_email ? admission.father_name : admission.mother_name) || "Parent";

    const studentEmail = await synthesizeStudentEmail(admin, admission.student_full_name, center);

    // 1. Parent account
    const parentPassword = generatePassword(20);
    const { data: parentCreated, error: parentCreateError } = await admin.auth.admin.createUser({
      email: parentEmail,
      password: parentPassword,
      email_confirm: true,
      user_metadata: { full_name: parentName, role: "parent", center_id: admission.center_id },
    });
    if (parentCreateError || !parentCreated.user) {
      throw new Error(`Could not create the parent account: ${parentCreateError?.message ?? "unknown error"}`);
    }
    createdUserIds.push(parentCreated.user.id);
    await admin.from("profiles").update({ must_change_password: true }).eq("id", parentCreated.user.id);

    // 2. Student account
    const studentPassword = generatePassword(20);
    const { data: studentCreated, error: studentCreateError } = await admin.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: { full_name: admission.student_full_name, role: "student", center_id: admission.center_id },
    });
    if (studentCreateError || !studentCreated.user) {
      throw new Error(`Could not create the student account: ${studentCreateError?.message ?? "unknown error"}`);
    }
    createdUserIds.push(studentCreated.user.id);
    await admin
      .from("profiles")
      .update({ must_change_password: true, date_of_birth: admission.student_dob })
      .eq("id", studentCreated.user.id);

    // 3. students row — placed directly into the class chosen on the intake
    // form (enrolment_class_id), if any, so the student sees themselves
    // already enrolled the first time they log in rather than "Not
    // assigned" until a separate manual step. is_autistic mirrors the
    // admission's own flag — this is what gates Autism Section visibility
    // for this student's parent(s), see Sidebar.tsx.
    const enrollmentNumber = await generateEnrollmentNumber(admin);
    const { error: studentRowError } = await admin.from("students").insert({
      id: studentCreated.user.id,
      enrollment_number: enrollmentNumber,
      class_id: admission.enrolment_class_id ?? null,
      is_autistic: admission.is_autistic,
      guardian_name: parentName,
      guardian_phone: admission.father_email ? admission.father_mobile : admission.mother_mobile,
      guardian_email: parentEmail,
      address: assembleAddress(admission),
    });
    if (studentRowError) throw new Error(`Could not save student details: ${studentRowError.message}`);

    // 4. Link parent <-> student
    const { error: linkError } = await admin
      .from("parent_students")
      .insert({ parent_id: parentCreated.user.id, student_id: studentCreated.user.id });
    if (linkError) throw new Error(`Could not link parent and student: ${linkError.message}`);

    // 5-7. PDF generation + upload
    const pdfBytes = await generateAdmissionPdf(admission, center);
    const pdfPath = `${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await admin.storage
      .from("admissions-pdfs")
      .upload(pdfPath, pdfBytes, { contentType: "application/pdf" });
    if (uploadError) throw new Error(`Could not save the generated PDF: ${uploadError.message}`);

    // 8. Welcome email — queued via the durable outbox (see
    // src/lib/email/send.ts); only throws if even queuing it failed.
    const { html, text } = welcomeEmailBody({
      center,
      studentName: admission.student_full_name,
      studentEmail,
      studentPassword,
      parentEmail,
      parentPassword,
    });
    await sendEmail({
      to: parentEmail,
      subject: "Welcome to Al Kamal — Your Account is Ready",
      html,
      text,
      related: { table: "admissions", id: admissionId },
    });

    // 9. Mark processed
    const { error: updateError } = await admin
      .from("admissions")
      .update({
        status: "processed",
        error: null,
        student_profile_id: studentCreated.user.id,
        parent_profile_id: parentCreated.user.id,
        pdf_file_path: pdfPath,
        enrollment_number: enrollmentNumber,
      })
      .eq("id", admissionId);
    if (updateError) throw new Error(`Accounts and PDF were created, but the admission record couldn't be updated: ${updateError.message}`);

    await logAuditEvent(actorId, "create_admission", "admissions", admissionId, {
      center_id: admission.center_id,
      student_full_name: admission.student_full_name,
    });
  } catch (err) {
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    const message = err instanceof Error ? err.message : "Unknown error while processing the admission.";
    await admin.from("admissions").update({ status: "failed", error: message }).eq("id", admissionId);
    throw new Error(message);
  }
}
