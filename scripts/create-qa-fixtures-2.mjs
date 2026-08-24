#!/usr/bin/env node
// Part 2 of the disposable QA fixture set: an AKET student + parent (the
// data the Admissions feature would normally create) and an
// autism_assignments row linking qa.teacher@alkamaleducation.com to that
// student (the data /admin/autism would normally create) — created
// directly via the service-role client since admin-side browser testing
// is blocked on MFA this session (see chat). Everything here is deletable
// via scripts/delete-qa-fixtures.mjs.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(rootDir, ".env.local");
function loadEnvLocal() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AKET_CENTER_ID = "00000000-0000-0000-0000-000000000002";
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
function generatePassword(length = 20) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

async function createAccount(email, role, fullName) {
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) {
    console.log(`Already exists: ${email} (${existing.id})`);
    return { id: existing.id, password: null };
  }
  const password = generatePassword(20);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, center_id: AKET_CENTER_ID },
  });
  if (error) {
    console.error(`Failed to create ${email}:`, error.message);
    process.exit(1);
  }
  await supabase.from("profiles").update({ must_change_password: false }).eq("id", data.user.id);
  console.log(`Created ${role}: ${email} / ${password}`);
  return { id: data.user.id, password };
}

const parent = await createAccount("qa.parent@alkamaleducation.com", "parent", "QA Test Parent");
const student = await createAccount("qa.student@alkamaleducation.com", "student", "QA Test Student");

if (student.password) {
  const { error: studentRowError } = await supabase.from("students").insert({
    id: student.id,
    enrollment_number: "QA-STU-01",
    guardian_name: "QA Test Parent",
    guardian_email: "qa.parent@alkamaleducation.com",
  });
  if (studentRowError) console.error("students insert:", studentRowError.message);
}

const { data: existingLink } = await supabase
  .from("parent_students")
  .select("id")
  .eq("parent_id", parent.id)
  .eq("student_id", student.id)
  .maybeSingle();
if (!existingLink) {
  const { error } = await supabase.from("parent_students").insert({ parent_id: parent.id, student_id: student.id });
  if (error) console.error("parent_students insert:", error.message);
  else console.log("Linked parent <-> student.");
}

const { data: teacher } = await supabase.from("profiles").select("id").eq("email", "qa.teacher@alkamaleducation.com").maybeSingle();
if (!teacher) {
  console.error("qa.teacher@alkamaleducation.com not found — run create-qa-fixtures.mjs first.");
  process.exit(1);
}

const { data: existingAssignment } = await supabase
  .from("autism_assignments")
  .select("id")
  .eq("teacher_id", teacher.id)
  .eq("student_id", student.id)
  .maybeSingle();
if (!existingAssignment) {
  const { error } = await supabase.from("autism_assignments").insert({ teacher_id: teacher.id, student_id: student.id });
  if (error) console.error("autism_assignments insert:", error.message);
  else console.log("Assigned qa.teacher to qa.student in the Autism Section.");
}

console.log("\nDone.");
