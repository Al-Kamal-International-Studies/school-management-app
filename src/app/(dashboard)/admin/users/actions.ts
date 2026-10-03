"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { setAccountBanned } from "@/lib/auth/accountAccess";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";
import { passwordZodSchema, MIN_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH_ADMIN } from "@/lib/security/password";
import { checkRateLimit, clearRateLimit, recordRateLimitAttempt } from "@/lib/security/rateLimit";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const createUserSchema = z.object({
  role: z.enum(["teacher", "student", "parent"]),
  full_name: z.string().trim().min(2, "Full name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  // This form only ever creates teacher/student/parent accounts (see the
  // role enum above — there is no path to create an admin here), so the
  // regular (non-admin) minimum applies. See docs/SECURITY.md F5.
  password: passwordZodSchema(MIN_PASSWORD_LENGTH),
  phone: z.string().optional(),
  // teacher-only
  employee_id: z.string().optional(),
  qualification: z.string().optional(),
  // student-only
  enrollment_number: z.string().optional(),
  class_id: z.string().optional(),
  date_of_birth: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
});

export async function createUserAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");

  // Keyed by the acting admin, not the new account — this protects against
  // a compromised/malicious admin session mass-creating accounts, not
  // against a legitimate admin's normal onboarding pace.
  const bucket = `create_user:${me.id}`;
  const { limited } = await checkRateLimit(bucket, { maxAttempts: 20, windowSeconds: 60 * 60 });
  if (limited) return { error: "Too many accounts created recently. Wait a while before creating more." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = createUserSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }
  const data = parsed.data;

  if (data.role === "teacher" && !data.employee_id?.trim()) {
    return { error: "Employee ID is required for teachers." };
  }
  if (data.role === "student" && !data.enrollment_number?.trim()) {
    return { error: "Enrollment number is required for students." };
  }

  const admin = createAdminClient();

  // The on_auth_user_created trigger (see 0027_centers.sql) reads
  // center_id straight out of user_metadata and falls back to AKIS if it's
  // absent — so without this, every account a multi-center admin creates
  // while viewing AKET would silently land in AKIS instead, regardless of
  // which center's dropdown they were just looking at. `me.center_id` is
  // deliberately NOT used here — that's the admin's own home center, not
  // necessarily the one they're currently working in.
  const activeCenterId = (await getActiveCenterForRequest())!;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name, role: data.role, center_id: activeCenterId },
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create the account." };
  }

  const userId = created.user.id;

  // Profile row is created by the on_auth_user_created trigger; set phone,
  // date of birth, and must_change_password here since none of those are
  // part of user_metadata. must_change_password is unconditional — every
  // admin-created account gets a password the admin chose, not the person
  // themselves, so they're always prompted to set their own on first login
  // (requireRole()'s /force-password-change gate).
  await admin
    .from("profiles")
    .update({ phone: data.phone || null, date_of_birth: data.date_of_birth || null, must_change_password: true })
    .eq("id", userId);

  if (data.role === "teacher") {
    const { error } = await admin.from("teachers").insert({
      id: userId,
      employee_id: data.employee_id!,
      qualification: data.qualification || null,
    });
    if (error) {
      await admin.auth.admin.deleteUser(userId);
      return { error: `Could not save teacher details: ${error.message}` };
    }
  } else if (data.role === "student") {
    const { error } = await admin.from("students").insert({
      id: userId,
      enrollment_number: data.enrollment_number!,
      class_id: data.class_id || null,
      guardian_name: data.guardian_name || null,
      guardian_phone: data.guardian_phone || null,
      guardian_email: data.guardian_email || null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      emergency_contact_relationship: data.emergency_contact_relationship || null,
    });
    if (error) {
      await admin.auth.admin.deleteUser(userId);
      return { error: `Could not save student details: ${friendlyDbError(error.message)}` };
    }

    if (data.class_id) {
      await admin.from("enrollments").insert({
        student_id: userId,
        class_id: data.class_id,
        academic_year: new Date().getFullYear().toString(),
      });
    }
  } else {
    // parent — no extension table row; just link to the selected children.
    const childIds = formData.getAll("child_ids").filter((v): v is string => typeof v === "string" && v.length > 0);
    if (childIds.length > 0) {
      const { error } = await admin.from("parent_students").insert(childIds.map((studentId) => ({ parent_id: userId, student_id: studentId })));
      if (error) {
        await admin.auth.admin.deleteUser(userId);
        return { error: `Could not link children: ${error.message}` };
      }
    }
  }

  await recordRateLimitAttempt(bucket);
  await logAuditEvent(me.id, `create_${data.role}_account`, "profiles", userId, { email: data.email, full_name: data.full_name });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/**
 * Loads an account through the CALLER's own RLS-scoped client — so it only
 * resolves for accounts in a center the acting admin can reach — and returns
 * the facts the actions need (the role comes from here, not from the form).
 */
async function getManageableTarget(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, email, center_id, archived_at")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

/** Maps the raw Postgres constraint messages an admin would otherwise see to plain English. */
function friendlyDbError(message: string): string {
  if (/students_enrollment_number_key/.test(message)) return "That enrollment number is already in use.";
  if (/teachers_employee_id_key/.test(message)) return "That employee ID is already in use.";
  if (/classes_center_name_section_year_key/.test(message)) return "A class with that name, section and academic year already exists.";
  if (/duplicate key value/.test(message)) return "That value is already in use.";
  if (/foreign key/.test(message)) return "One of the selected records no longer exists.";
  return message;
}

const updateUserSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(2, "Full name is required."),
  phone: z.string().optional(),
  class_id: z.string().optional(),
  qualification: z.string().optional(),
});

export async function updateUserAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }
  const data = parsed.data;

  // The target is looked up through the CALLER's own RLS-scoped client (so an
  // admin can only ever act on accounts in a center they have access to) and its
  // role is read from the database — never from a client-supplied form field.
  const target = await getManageableTarget(data.id);
  if (!target) return { error: "Account not found." };
  if (target.role === "admin") return { error: "Admin accounts can't be edited here." };

  const admin = createAdminClient();

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: data.full_name, phone: data.phone || null })
    .eq("id", data.id);
  if (profileError) return { error: friendlyDbError(profileError.message) };

  if (target.role === "student") {
    // Only touch the class if a class was actually offered in the form AND it belongs to the student's own center.
    if (formData.has("class_id")) {
      const classId = data.class_id || null;
      if (classId) {
        const { data: klass } = await admin.from("classes").select("center_id").eq("id", classId).maybeSingle();
        if (!klass || klass.center_id !== target.center_id) return { error: "That class belongs to a different center." };
      }
      await admin.from("students").update({ class_id: classId }).eq("id", data.id);
    }
  } else if (target.role === "teacher") {
    await admin.from("teachers").update({ qualification: data.qualification || null }).eq("id", data.id);
  } else if (target.role === "parent") {
    const childIds = new Set(formData.getAll("child_ids").filter((v): v is string => typeof v === "string" && v.length > 0));
    const offeredIds = new Set(formData.getAll("offered_child_ids").filter((v): v is string => typeof v === "string"));
    const { data: existingLinks } = await admin.from("parent_students").select("student_id").eq("parent_id", data.id);
    const existing = new Set((existingLinks ?? []).map((l) => l.student_id));

    // Diff instead of delete-all-then-reinsert: only links the admin actually
    // un-ticked (among the students the form really offered) are deleted, only
    // newly ticked ones are inserted (and only for students in the parent's own
    // center). A form that never offered a child can no longer silently unlink it.
    const toRemove = [...existing].filter((id) => offeredIds.has(id) && !childIds.has(id));
    const toAdd = [...childIds].filter((id) => !existing.has(id));
    if (toAdd.length > 0) {
      const { data: kids } = await admin.from("profiles").select("id, center_id").in("id", toAdd);
      const validIds = new Set((kids ?? []).filter((k) => k.center_id === target.center_id).map((k) => k.id));
      if (toAdd.some((id) => !validIds.has(id))) return { error: "A selected student belongs to a different center." };
    }
    if (toRemove.length > 0) await admin.from("parent_students").delete().eq("parent_id", data.id).in("student_id", toRemove);
    if (toAdd.length > 0) {
      const { error } = await admin.from("parent_students").insert(toAdd.map((studentId) => ({ parent_id: data.id, student_id: studentId })));
      if (error) return { error: friendlyDbError(error.message) };
    }
  }

  await logAuditEvent(me.id, "update_user", "profiles", data.id, { full_name: data.full_name });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${data.id}`);
  redirect("/admin/users");
}

export async function setUserActiveAction(userId: string, isActive: boolean) {
  const me = await requireRole("admin");
  const target = await getManageableTarget(userId);
  if (!target) throw new Error("Account not found.");
  // Admin accounts are never (de)activated from this UI — that includes the
  // acting admin themselves and the Principal — and an archived ("permanently
  // deleted") account can't be re-enabled by flipping the Active switch.
  if (target.role === "admin") throw new Error("Admin accounts can't be changed here.");
  if (target.archived_at) throw new Error("This account was permanently deleted and can't be reactivated.");
  const supabase = await createClient();
  // Reactivating also resets the failed-login counter — otherwise an
  // account auto-deactivated at 3 failed attempts would immediately re-trip
  // the same lockout on its very next mistyped password after an admin
  // brings it back. Only relevant going from inactive -> active; harmless
  // to always include (it's just already 0 in the deactivate direction).
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive, failed_login_attempts: 0 })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  // Ban at the Auth level too when deactivating, so the account can't sign
  // back in or refresh an existing session — see lib/auth/accountAccess.ts.
  await setAccountBanned(userId, !isActive);
  // A re-activated user must not still be told "Too many failed attempts" for up
  // to 15 minutes because of the very failures that got them locked out.
  if (isActive) await clearRateLimit(`login:${target.email.toLowerCase()}`);
  await logAuditEvent(me.id, isActive ? "activate_account" : "deactivate_account", "profiles", userId);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

/**
 * "Permanently delete" in the UI — but this is a soft delete, never a real
 * DELETE. Sets archived_at/archived_by and forces is_active=false; the row
 * and all its history (progress entries, enrollments, etc.) stay in
 * Postgres for audit purposes. listUsers() filters archived_at is null so
 * archived accounts disappear from active lists without being erased.
 */
export async function archiveUserAction(userId: string) {
  const me = await requireRole("admin");
  const target = await getManageableTarget(userId);
  if (!target) throw new Error("Account not found.");
  if (target.role === "admin") throw new Error("Admin accounts can't be deleted here.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false, archived_at: new Date().toISOString(), archived_by: me.id })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  // An archived student must stop appearing in class rosters (attendance,
  // grades, remarks, progress, class pages all list by students.class_id) —
  // otherwise they keep being marked "present" every day.
  if (target.role === "student") await createAdminClient().from("students").update({ class_id: null }).eq("id", userId);
  await setAccountBanned(userId, true);
  await logAuditEvent(me.id, "archive_account", "profiles", userId);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

/**
 * Admin sets a new password for someone else's account directly — no email
 * link, no token. Uses the service-role admin API (updateUserById), the
 * only way to set another user's password at all (Supabase's regular
 * updateUser() always targets the caller). Forces must_change_password so
 * the recipient is prompted to pick their own password the next time they
 * sign in (see requireRole()'s /force-password-change gate), and resolves
 * any pending password-reset request for that email so it drops out of the
 * /admin/password-reset-requests inbox automatically.
 */
export async function adminSetUserPasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");

  const schema = z.object({ id: z.string().uuid(), password: z.string() });
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Invalid form data." };

  // Resolved through the caller's own RLS-scoped client, so only accounts in a
  // center this admin can access are reachable — and admin accounts never are
  // (an admin must not be able to set another admin's, e.g. the Principal's,
  // password from a form).
  const target = await getManageableTarget(parsed.data.id);
  if (!target) return { error: "Account not found." };
  if (target.role === "admin") return { error: "Admin passwords can't be set here." };
  const admin = createAdminClient();

  const minLength = MIN_PASSWORD_LENGTH;
  const passwordCheck = passwordZodSchema(minLength).safeParse(parsed.data.password);
  if (!passwordCheck.success) return { error: passwordCheck.error.issues[0]?.message ?? "Invalid password." };

  const { error } = await admin.auth.admin.updateUserById(parsed.data.id, { password: passwordCheck.data });
  if (error) return { error: error.message };

  await admin.from("profiles").update({ must_change_password: true }).eq("id", parsed.data.id);

  await admin
    .from("password_reset_requests")
    .update({ status: "completed", resolved_at: new Date().toISOString(), resolved_by: me.id })
    .eq("email", target.email)
    .eq("status", "pending");

  await logAuditEvent(me.id, "admin_set_password", "profiles", parsed.data.id);
  revalidatePath(`/admin/users/${parsed.data.id}`);
  revalidatePath("/admin/password-reset-requests");

  return { success: true };
}
