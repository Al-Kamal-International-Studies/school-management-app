#!/usr/bin/env node
// One-time bulk onboarding: the principal + 2 teachers + 23 students Muhammad
// specified, the classes they belong to (Primary Stage 1|Grade 1 through
// Primary Stage 7|Grade 7), the 2 subjects the school didn't have yet
// (Arabic, Islamic Studies — "ICT" reuses the existing Computer Science
// subject, per Muhammad's confirmation), and the class_subject_teachers
// assignments spelled out in the request. Safe to re-run: every step checks
// for an existing row first and skips it rather than erroring or
// duplicating.
//
// Same shape as scripts/create-admin.mjs: reads .env.local directly, uses
// the service-role client, no new dependencies. Run with:
//   node scripts/bulk-onboard.mjs
//
// Requires migrations 0001-0022 already applied (must_change_password is
// set on every account this script creates — see 0022_account_security_columns.sql).

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

// ---------------------------------------------------------------------------
// Password generator — same excludes-visually-ambiguous-characters approach
// as AdminSetPasswordForm.tsx's client-side generator, reimplemented here
// since this is a standalone Node script (can't import a "use client"
// React component). 20 chars — comfortably clears the 15-char admin floor
// too, since the principal account needs that minimum.
// ---------------------------------------------------------------------------
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
function generatePassword(length = 20) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

function emailFor(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0].toLowerCase();
  const last = parts[parts.length - 1].toLowerCase();
  return `${first}.${last}@alkamalinternational.com`;
}

const created = []; // { name, role, email, password, details }

// ---------------------------------------------------------------------------
// 1. Subjects — ensure Arabic + Islamic Studies exist. Everything else
//    (English, Mathematics, Science, Social Studies, Computer Science)
//    already exists and is reused as-is.
// ---------------------------------------------------------------------------
async function ensureSubject(name, code) {
  const { data: existing } = await supabase.from("subjects").select("id").eq("code", code).maybeSingle();
  if (existing) {
    console.log(`  subject ${name} (${code}) already exists — skipping`);
    return existing.id;
  }
  const { data, error } = await supabase.from("subjects").insert({ name, code }).select("id").single();
  if (error) throw new Error(`Failed to create subject ${name}: ${error.message}`);
  console.log(`  created subject ${name} (${code})`);
  return data.id;
}

// ---------------------------------------------------------------------------
// 2. Classes — rename the existing "Grade 1" to "Primary Stage 1 | Grade 1"
//    (same row/id, so the existing test student's enrollment is untouched),
//    then create Primary Stage 2 | Grade 2 through Primary Stage 7 | Grade 7.
// ---------------------------------------------------------------------------
async function ensureClass(grade, name) {
  const { data: existing } = await supabase.from("classes").select("id").eq("name", name).eq("section", "A").maybeSingle();
  if (existing) {
    console.log(`  class "${name}" already exists — skipping`);
    return existing.id;
  }
  const { data, error } = await supabase
    .from("classes")
    .insert({ name, section: "A", academic_year: "2026" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create class ${name}: ${error.message}`);
  console.log(`  created class "${name}"`);
  return data.id;
}

async function renameGradeOneClass(newName) {
  const { data: existing } = await supabase.from("classes").select("id, name").eq("name", "Grade 1").eq("section", "A").maybeSingle();
  if (!existing) {
    console.log(`  no existing "Grade 1" class found to rename — creating "${newName}" fresh instead`);
    return ensureClass(1, newName);
  }
  const { error } = await supabase.from("classes").update({ name: newName }).eq("id", existing.id);
  if (error) throw new Error(`Failed to rename Grade 1: ${error.message}`);
  console.log(`  renamed existing "Grade 1" class -> "${newName}" (same row, enrollments preserved)`);
  return existing.id;
}

// ---------------------------------------------------------------------------
// 3. Accounts
// ---------------------------------------------------------------------------
async function findProfileIdByEmail(email) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
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
    user_metadata: { full_name: fullName, role },
  });
  if (createError || !userData.user) {
    throw new Error(`Failed to create ${email}: ${createError?.message ?? "unknown error"}`);
  }
  const userId = userData.user.id;

  // Profile row comes from the on_auth_user_created trigger; set title and
  // must_change_password here (every account this script creates gets a
  // password it didn't choose, so it must set its own on first login).
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

// ---------------------------------------------------------------------------
// 4. class_subject_teachers — delete the 2 pre-existing rows that conflict
//    with the new spec, then insert the full correct set.
// ---------------------------------------------------------------------------
async function clearAssignment(classId, subjectId, teacherId) {
  const { data } = await supabase
    .from("class_subject_teachers")
    .select("id")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (!data) return;
  await supabase.from("class_subject_teachers").delete().eq("id", data.id);
  console.log("  removed a conflicting pre-existing assignment");
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("1. Subjects");
  const subjectIds = {
    english: (await supabase.from("subjects").select("id").eq("code", "ENG").single()).data?.id,
    math: (await supabase.from("subjects").select("id").eq("code", "MATH").single()).data?.id,
    science: (await supabase.from("subjects").select("id").eq("code", "SCI").single()).data?.id,
    computerScience: (await supabase.from("subjects").select("id").eq("code", "CS").single()).data?.id,
    socialStudies: (await supabase.from("subjects").select("id").eq("code", "SOC").single()).data?.id,
    arabic: await ensureSubject("Arabic", "ARB"),
    islamic: await ensureSubject("Islamic Studies", "ISL"),
  };
  for (const [key, id] of Object.entries(subjectIds)) {
    if (!id) throw new Error(`Could not resolve subject id for "${key}" — check the subjects table.`);
  }

  console.log("\n2. Classes");
  const classIds = {
    1: await renameGradeOneClass("Primary Stage 1 | Grade 1"),
    2: await ensureClass(2, "Primary Stage 2 | Grade 2"),
    3: await ensureClass(3, "Primary Stage 3 | Grade 3"),
    4: await ensureClass(4, "Primary Stage 4 | Grade 4"),
    5: await ensureClass(5, "Primary Stage 5 | Grade 5"),
    6: await ensureClass(6, "Primary Stage 6 | Grade 6"),
    7: await ensureClass(7, "Primary Stage 7 | Grade 7"),
  };

  console.log("\n3. Principal");
  await createAccount({
    email: "principal@alkamalinternational.com",
    fullName: "Principal",
    role: "admin",
    title: "Principal",
  });

  console.log("\n4. Teachers");
  // Fathima Azna Azna already exists as fathimazmi@gmail.com ("Fathima Azna
  // Azmi") — reused, not duplicated. Her class_subject_teachers assignment
  // is corrected below, not her account.
  const fathimaId = await findProfileIdByEmail("fathimazmi@gmail.com");
  if (!fathimaId) {
    console.warn('  WARNING: could not find the existing "fathimazmi@gmail.com" account — Fathima\'s assignments below will be skipped.');
  }

  const samarId = await createAccount({
    email: "samar.essa@alkamalinternational.com",
    fullName: "Samar Khairi Essa",
    role: "teacher",
    employeeId: "00002",
  });
  const muneebaId = await createAccount({
    email: "muneeba.junaid@alkamalinternational.com",
    fullName: "Muneeba Junaid",
    role: "teacher",
    employeeId: "00003",
  });

  console.log("\n5. Students");
  const students = [
    // grade 1
    ["Talal A M Awad", 1],
    ["Amir Fadi Abdelghaffar Elsayed Mohammed", 1],
    ["Zayed Abdulaziz Osman", 1],
    ["Muhammad Nasir Taer", 1],
    ["Kylie Madulira", 1],
    ["Kayan Abdulhameed Hussein Abdullah", 1],
    ["Yamariam Zekeke Haliu", 1],
    ["Anstasia Kroulous Magdy Ayad Mikhaeil", 1],
    ["Talin Radwan Ammouri", 1],
    // grade 2
    ["Lya Radwan Ammouri", 2],
    ["Rahma Muhammad Waqas", 2],
    ["Yashfa Mubeen Muhammad Mubeen Akhtar", 2],
    ["Imaan Busiswa Mwangi", 2],
    ["Yousef Mohammad Gandiw Zacarias", 2],
    ["Zywa Mehboob", 2],
    ["Khushi Abdul Rahim Gopang Abdul Rahim Gopang", 2],
    ["Aksa Abdul Rahim Gopang Abdul Rahim Gopang", 2],
    // grade 4
    ["Uswa Mubeen Muhammad Mubeen Akhtar", 4],
    ["Haddassah Esther Wanjiru Mwangi", 4],
    // grade 6
    ["Zainab Noor", 6],
    ["Eiman Fatima Muhammad Haseeb", 6],
    // grade 7
    ["Aysha Noor", 7],
    ["Esra Shinaey Khan", 7],
  ];

  const perGradeCounter = {};
  for (const [fullName, grade] of students) {
    perGradeCounter[grade] = (perGradeCounter[grade] ?? 0) + 1;
    const enrollmentNumber = `G${grade}-${String(perGradeCounter[grade]).padStart(2, "0")}`;
    await createAccount({
      email: emailFor(fullName),
      fullName,
      role: "student",
      enrollmentNumber,
      classId: classIds[grade],
    });
  }

  console.log("\n6. class_subject_teachers");
  if (fathimaId) {
    console.log(" Fathima — Grade 1 (ENG, MATH, SCI, ICT/Computer Science)");
    await clearAssignment(classIds[1], subjectIds.socialStudies, fathimaId); // old, conflicting assignment
    await assign(classIds[1], subjectIds.english, fathimaId, "Fathima -> Grade1 English");
    await assign(classIds[1], subjectIds.math, fathimaId, "Fathima -> Grade1 Math");
    await assign(classIds[1], subjectIds.science, fathimaId, "Fathima -> Grade1 Science");
    await assign(classIds[1], subjectIds.computerScience, fathimaId, "Fathima -> Grade1 Computer Science");
  }

  // Pre-existing test-teacher assignment that conflicts with the above —
  // removed regardless of whose id it was under, since the new spec has
  // Fathima owning Grade 1 Math exclusively.
  const testTeacherId = await findProfileIdByEmail("testteacher@alkamalinternational.com");
  if (testTeacherId) {
    await clearAssignment(classIds[1], subjectIds.math, testTeacherId);
  }

  console.log(" Muneeba — Grade 6 & 7 (ENG, MATH, SCI, ICT/Computer Science)");
  for (const grade of [6, 7]) {
    await assign(classIds[grade], subjectIds.english, muneebaId, `Muneeba -> Grade${grade} English`);
    await assign(classIds[grade], subjectIds.math, muneebaId, `Muneeba -> Grade${grade} Math`);
    await assign(classIds[grade], subjectIds.science, muneebaId, `Muneeba -> Grade${grade} Science`);
    await assign(classIds[grade], subjectIds.computerScience, muneebaId, `Muneeba -> Grade${grade} Computer Science`);
  }

  console.log(" Samar — Arabic, Islamic Studies, Social Studies for every grade (1-7)");
  for (const grade of [1, 2, 3, 4, 5, 6, 7]) {
    await assign(classIds[grade], subjectIds.arabic, samarId, `Samar -> Grade${grade} Arabic`);
    await assign(classIds[grade], subjectIds.islamic, samarId, `Samar -> Grade${grade} Islamic Studies`);
    await assign(classIds[grade], subjectIds.socialStudies, samarId, `Samar -> Grade${grade} Social Studies`);
  }

  // ---------------------------------------------------------------------------
  // Credentials handoff — printed AND written to a local, gitignored file,
  // since there's no verified email-sending set up for this project
  // (HANDOVER.md Part 3 §17) to deliver these any other way. Only ever
  // shown once, here — the actual password hashes aren't retrievable later.
  // ---------------------------------------------------------------------------
  console.log("\n\n=== NEW ACCOUNT CREDENTIALS (relay these securely — shown once) ===\n");
  console.table(created.map(({ password: _password, ...rest }) => rest)); // no plaintext passwords in the console table
  console.log("Full credentials (including passwords) written to scripts/output/ — see below.\n");

  if (created.length > 0) {
    const outDir = path.join(rootDir, "scripts", "output");
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `credentials-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`);
    const lines = [
      "Al Kamal International Studies — new account credentials",
      `Generated ${new Date().toISOString()}`,
      "Every account must change this password on first login.",
      "",
      ...created.map((c) => `${c.role.padEnd(8)} ${c.name.padEnd(45)} ${c.email.padEnd(45)} ${c.password}`),
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
