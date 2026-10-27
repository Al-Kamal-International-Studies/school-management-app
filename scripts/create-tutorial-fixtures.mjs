#!/usr/bin/env node
// One-off: creates a disposable, self-contained demo setup for recording the
// teacher introduction video, following the same "disposable fixture,
// created and fully deleted" precedent as create-qa-fixtures.mjs (HANDOVER.md
// Part 7 / Part 13 / Part 26). Everything here is removed again by
// scripts/delete-tutorial-fixtures.mjs.
//
// Creates (all on AKIS):
//   - 1 teacher: tutorial.teacher@alkamalinternational.com ("Demo Teacher"),
//     every first-login gate pre-cleared (password change, passkey nudge,
//     guided tour) and one pre-registered device so a recording browser can
//     go straight to the dashboard.
//   - 1 class: "Demo Class | Grade 5" (A), with the demo teacher as homeroom
//     teacher and assigned to four of the school's REAL subjects (Mathematics,
//     English, Science, Arabic). class_subject_teachers is unique per
//     (class, subject), so this touches no real class's assignments.
//   - 5 student accounts placed in that class.
//
// Then signs the teacher in server-to-server and writes the resulting
// @supabase/ssr session cookies (plus the device_id + locale cookies) to
// scripts/output/tutorial-session.json (gitignored), so a browser can be
// handed a ready session without anyone typing a password into it.

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceRoleKey) {
  console.error("Missing Supabase env vars in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const AKIS_CENTER_ID = "00000000-0000-0000-0000-000000000001";
const TEACHER_EMAIL = "tutorial.teacher@alkamalinternational.com";
const CLASS_NAME = "Demo Class | Grade 5";
const SUBJECT_CODES = ["MATH", "ENG", "SCI", "ARB"];
const STUDENTS = [
  ["tutorial.student1@alkamalinternational.com", "Aisha Rahman", "DEMO-STU-01"],
  ["tutorial.student2@alkamalinternational.com", "Omar Khalid", "DEMO-STU-02"],
  ["tutorial.student3@alkamalinternational.com", "Layla Hassan", "DEMO-STU-03"],
  ["tutorial.student4@alkamalinternational.com", "Yusuf Ali", "DEMO-STU-04"],
  ["tutorial.student5@alkamalinternational.com", "Mariam Saeed", "DEMO-STU-05"],
];

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
function generatePassword(length = 24) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

function fail(label, error) {
  console.error(`${label}:`, error.message);
  process.exit(1);
}

async function createAccount(email, role, fullName) {
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) fail(email, new Error("already exists — run delete-tutorial-fixtures.mjs first"));
  const password = generatePassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, center_id: AKIS_CENTER_ID },
  });
  if (error) fail(`create ${email}`, error);
  return { id: data.user.id, password };
}

// --- Teacher ---------------------------------------------------------------
const teacher = await createAccount(TEACHER_EMAIL, "teacher", "Demo Teacher");
{
  const { error } = await supabase
    .from("profiles")
    .update({
      must_change_password: false,
      passkey_prompt_dismissed_at: new Date().toISOString(),
      has_seen_tour: true,
      tour_version_seen: 4,
    })
    .eq("id", teacher.id);
  if (error) fail("teacher profile update", error);
}
{
  const { error } = await supabase
    .from("teachers")
    .insert({ id: teacher.id, employee_id: "DEMO-TEACH-01", qualification: "B.Ed." });
  if (error) fail("teachers insert", error);
}

// --- Class + subject assignments --------------------------------------------
const { data: klass, error: classError } = await supabase
  .from("classes")
  .insert({ name: CLASS_NAME, section: "A", academic_year: "2026", center_id: AKIS_CENTER_ID, homeroom_teacher_id: teacher.id })
  .select("id")
  .single();
if (classError) fail("classes insert", classError);

const { data: subjects, error: subjectsError } = await supabase
  .from("subjects")
  .select("id, code")
  .eq("center_id", AKIS_CENTER_ID)
  .in("code", SUBJECT_CODES);
if (subjectsError) fail("subjects lookup", subjectsError);
{
  const { error } = await supabase
    .from("class_subject_teachers")
    .insert(subjects.map((s) => ({ class_id: klass.id, subject_id: s.id, teacher_id: teacher.id })));
  if (error) fail("class_subject_teachers insert", error);
}

// --- Students ---------------------------------------------------------------
for (const [email, fullName, enrollmentNumber] of STUDENTS) {
  const student = await createAccount(email, "student", fullName);
  await supabase.from("profiles").update({ must_change_password: false }).eq("id", student.id);
  const { error } = await supabase
    .from("students")
    .insert({ id: student.id, enrollment_number: enrollmentNumber, class_id: klass.id, guardian_name: `${fullName.split(" ")[1]} family` });
  if (error) fail(`students insert ${email}`, error);
  const { error: enrollError } = await supabase
    .from("enrollments")
    .insert({ student_id: student.id, class_id: klass.id, academic_year: "2026" });
  if (enrollError) fail(`enrollments insert ${email}`, enrollError);
}

// --- Pre-registered device --------------------------------------------------
const deviceId = randomUUID();
{
  const { error } = await supabase
    .from("user_devices")
    .insert({ user_id: teacher.id, device_id: deviceId, label: "Tutorial recording browser" });
  if (error) fail("user_devices insert", error);
}

// --- Session cookies (exact @supabase/ssr format) ---------------------------
const captured = new Map();
const ssr = createServerClient(url, anonKey, {
  cookies: {
    getAll: () => [...captured.values()].map(({ name, value }) => ({ name, value })),
    setAll: (cookies) => cookies.forEach((c) => captured.set(c.name, c)),
  },
});
{
  const { error } = await ssr.auth.signInWithPassword({ email: TEACHER_EMAIL, password: teacher.password });
  if (error) fail("sign in", error);
}

const cookies = [
  ...[...captured.values()].map(({ name, value }) => ({ name, value })),
  { name: "device_id", value: deviceId },
  { name: "NEXT_LOCALE", value: "en" },
];

const outDir = path.join(rootDir, "scripts", "output");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "tutorial-session.json"),
  JSON.stringify({ teacherEmail: TEACHER_EMAIL, teacherPassword: teacher.password, classId: klass.id, cookies }, null, 2)
);

console.log(`Created teacher ${TEACHER_EMAIL}, class "${CLASS_NAME}" (${klass.id}), ${subjects.length} subjects, ${STUDENTS.length} students.`);
console.log("Session cookies written to scripts/output/tutorial-session.json (gitignored).");
