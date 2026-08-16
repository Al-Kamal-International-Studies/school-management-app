#!/usr/bin/env node
// One-time AKET (Al Kamal Education Technology) demo/test onboarding: one
// admin, one teacher, one parent, one student, plus a minimal class +
// subject + assignments so the accounts actually have something to look at
// rather than empty dashboards. Requested by Muhammad 2026-08-17 (see
// HANDOVER.md Part 6) so he can log in and try the AKET side of the app.
//
// Same shape as scripts/bulk-onboard.mjs / create-admin.mjs: reads
// .env.local directly, uses the service-role client, idempotent (checks
// before inserting, safe to re-run). Run with:
//   node scripts/bulk-onboard-aket.mjs
//
// Requires migration 0027_centers.sql already applied (center_id, the
// handle_new_user() trigger's center_id-from-metadata support, and
// profile_center_access all come from there).
//
// Email pattern per Muhammad's instruction: firstname.lastname@alkamaleducation.com.
// These are clearly-named test/demo accounts (same spirit as AKIS's own
// teststudent@/testteacher@/testparent@ accounts), not real staff/students —
// AKET has no real people onboarded yet.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(rootDir, ".env.local");

function loadEnvLocal() {
  if (!existsSync(envPath)) return;
  const contents = readFileSync(envPath, "utf-8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const AKET_CENTER_ID = "00000000-0000-0000-0000-000000000002";

// Same excludes-visually-ambiguous-characters approach as bulk-onboard.mjs.
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
function generatePassword(length = 20) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

const created = []; // { name, role, email, password, details }

async function findProfileIdByEmail(email) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

async function ensureSubject(name, code) {
  const { data: existing } = await supabase.from("subjects").select("id").eq("code", code).maybeSingle();
  if (existing) {
    console.log(`  subject ${name} (${code}) already exists — skipping`);
    return existing.id;
  }
  const { data, error } = await supabase
    .from("subjects")
    .insert({ name, code, center_id: AKET_CENTER_ID })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create subject ${name}: ${error.message}`);
  console.log(`  created subject ${name} (${code})`);
  return data.id;
}

async function ensureClass(name, section) {
  const { data: existing } = await supabase
    .from("classes")
    .select("id")
    .eq("name", name)
    .eq("section", section)
    .eq("center_id", AKET_CENTER_ID)
    .maybeSingle();
  if (existing) {
    console.log(`  class "${name} - ${section}" already exists — skipping`);
    return existing.id;
  }
  const { data, error } = await supabase
    .from("classes")
    .insert({ name, section, academic_year: "2026", center_id: AKET_CENTER_ID })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create class ${name}: ${error.message}`);
  console.log(`  created class "${name} - ${section}"`);
  return data.id;
}

async function createAccount({ email, fullName, role, title, employeeId, qualification, enrollmentNumber, classId }) {
  const existingId = await findProfileIdByEmail(email);
  if (existingId) {
    console.log(`  ${email} already exists — skipping account creation`);
    return existingId;
  }

  const password = generatePassword(20);
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // center_id here is read by handle_new_user() (0027_centers.sql) to set
    // both profiles.center_id and the matching profile_center_access grant
    // atomically — this is the one intentionally AKET-provisioning path
    // that trigger was built to support.
    user_metadata: { full_name: fullName, role, center_id: AKET_CENTER_ID },
  });
  if (createError || !userData.user) {
    throw new Error(`Failed to create ${email}: ${createError?.message ?? "unknown error"}`);
  }
  const userId = userData.user.id;

  await supabase.from("profiles").update({ title: title ?? null, must_change_password: true }).eq("id", userId);

  if (role === "teacher") {
    const { error } = await supabase.from("teachers").insert({ id: userId, employee_id: employeeId, qualification: qualification ?? null });
    if (error) throw new Error(`Failed to save teacher details for ${email}: ${error.message}`);
  } else if (role === "student") {
    const { error } = await supabase.from("students").insert({ id: userId, enrollment_number: enrollmentNumber, class_id: classId ?? null });
    if (error) throw new Error(`Failed to save student details for ${email}: ${error.message}`);
    if (classId) {
      const { error: enrollError } = await supabase.from("enrollments").insert({ student_id: userId, class_id: classId, academic_year: "2026" });
      if (enrollError) throw new Error(`Failed to enroll ${email}: ${enrollError.message}`);
    }
  }

  created.push({ name: fullName, role, email, password, details: title || employeeId || enrollmentNumber || "" });
  console.log(`  created ${role} ${fullName} <${email}>`);
  return userId;
}

async function assign(classId, subjectId, teacherId, label) {
  const { data: existing } = await supabase
    .from("class_subject_teachers")
    .select("id")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (existing) {
    console.log(`  ${label} already assigned — skipping`);
    return;
  }
  const { error } = await supabase.from("class_subject_teachers").insert({ class_id: classId, subject_id: subjectId, teacher_id: teacherId });
  if (error) throw new Error(`Failed to assign ${label}: ${error.message}`);
  console.log(`  assigned ${label}`);
}

async function linkParentToStudent(parentId, studentId) {
  const { data: existing } = await supabase
    .from("parent_students")
    .select("id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (existing) {
    console.log("  parent-student link already exists — skipping");
    return;
  }
  const { error } = await supabase.from("parent_students").insert({ parent_id: parentId, student_id: studentId });
  if (error) throw new Error(`Failed to link parent to student: ${error.message}`);
  console.log("  linked parent to student");
}

async function main() {
  console.log("1. Subject");
  const subjectId = await ensureSubject("Technology Fundamentals", "TECH");

  console.log("\n2. Class");
  const classId = await ensureClass("Foundation Program", "A");

  console.log("\n3. Admin");
  await createAccount({
    email: "test.admin@alkamaleducation.com",
    fullName: "Test Admin",
    role: "admin",
    title: "Admin",
  });

  console.log("\n4. Teacher");
  const teacherId = await createAccount({
    email: "test.teacher@alkamaleducation.com",
    fullName: "Test Teacher",
    role: "teacher",
    employeeId: "AKET-EMP-01",
  });

  console.log("\n5. Student");
  const studentId = await createAccount({
    email: "test.student@alkamaleducation.com",
    fullName: "Test Student",
    role: "student",
    enrollmentNumber: "AKET-STU-01",
    classId,
  });

  console.log("\n6. Parent");
  const parentId = await createAccount({
    email: "test.parent@alkamaleducation.com",
    fullName: "Test Parent",
    role: "parent",
  });

  console.log("\n7. Assignments");
  if (teacherId) await assign(classId, subjectId, teacherId, "Test Teacher -> Foundation Program A, Technology Fundamentals");
  if (parentId && studentId) await linkParentToStudent(parentId, studentId);

  console.log("\n\n=== NEW AKET ACCOUNT CREDENTIALS (relay these securely — shown once) ===\n");
  console.table(created.map(({ password: _password, ...rest }) => rest));
  console.log("Full credentials (including passwords) written to scripts/output/ — see below.\n");

  if (created.length > 0) {
    const outDir = path.join(rootDir, "scripts", "output");
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `credentials-aket-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`);
    const lines = [
      "Al Kamal Education Technology (AKET) — new account credentials",
      `Generated ${new Date().toISOString()}`,
      "Every account must change this password on first login.",
      "",
      ...created.map((c) => `${c.role.padEnd(8)} ${c.name.padEnd(20)} ${c.email.padEnd(40)} ${c.password}`),
    ];
    writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");
    console.log(`Written to: ${outPath}`);
    console.log("This file is gitignored (scripts/output/) — never commit it. Delete it once the passwords are relayed.");
  } else {
    console.log("No new accounts were created this run (everything already existed).");
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
