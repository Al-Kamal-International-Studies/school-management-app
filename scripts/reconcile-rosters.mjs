#!/usr/bin/env node
// One-time roster reconciliation requested directly by Muhammad in chat
// (2026-08-25): corrects the AKIS student roster to match his final list of
// 12 names (set DOBs, fix one incomplete name, create 2 missing students,
// archive 13 accounts not on the list), and sets up AKET's real teaching
// staff (4 teachers, 2 new classes, 5 new subjects, 2 class/subject
// assignments — Arathy the Autism Teacher gets an account only, no
// class/subject, per her role; Priyanga gets an account only, no
// class/subject, since none was specified).
//
// Same shape as scripts/bulk-onboard.mjs / rotate-password.mjs: reads
// .env.local directly, uses the service-role client, idempotent (every step
// checks for an existing row first). Archiving uses the exact same
// reversible effect as archiveUserAction/ArchiveUserButton.tsx in the app
// itself (is_active=false, archived_at/by, Supabase Auth ban, audit log) —
// never a hard delete, per this project's standing rule against permanent
// deletion (HANDOVER.md Part 13 §2).
//
// Run with: node scripts/reconcile-rosters.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnvLocal() {
  const envPath = "E:/Coding Projects/Claude/School App/.env.local";
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, serviceRoleKey);

const AKIS = "00000000-0000-0000-0000-000000000001";
const AKET = "00000000-0000-0000-0000-000000000002";

function generatePassword(length = 20) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

const created = [];

async function findProfileIdByEmail(email) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Phase 1: AKIS DOBs + Zainab's name fix
// ---------------------------------------------------------------------------
async function setDob(profileId, name, dob) {
  const { error } = await supabase.from("profiles").update({ date_of_birth: dob }).eq("id", profileId);
  if (error) throw new Error(`Failed to set DOB for ${name}: ${error.message}`);
  console.log(`  DOB set: ${name} -> ${dob}`);
}

async function phase1() {
  console.log("\n=== Phase 1: AKIS DOBs + name fix ===");
  const dobs = [
    ["86d27ef8-1f0d-405e-b196-2b4ef0d114a3", "Kayan Abdulhameed Hussein Abdullah", "2019-12-04"],
    ["0904bee1-d4c7-495b-b506-89245be22ca0", "Anstasia Kroulous Magdy Ayad Mikhaeil", "2019-12-08"],
    ["96690f05-b6be-4e4f-a8bd-478368cf66a6", "Kylie Madulira", "2019-09-03"],
    ["1f08d7a7-5386-46d3-9263-51ff9e19c645", "Imaan Busiswa Mwangi", "2018-06-02"],
    ["bbd497a5-08df-4f95-af6c-6825ca42613b", "Yashfa Mubeen Muhammad Mubeen Akhtar", "2019-02-06"],
    ["d0aa5c82-7ea8-4d59-9e47-e706bd84e241", "Rahma Muhammad Waqas", "2019-07-16"],
    ["02ef3b76-b766-4151-ad9d-ed3c4eb165df", "Haddassah Esther Wanjiru Mwangi", "2016-07-27"],
    ["e80bfd3f-110f-4500-9dd0-a7e16fab9818", "Uswa Mubeen Muhammad Mubeen Akhtar", "2016-10-23"],
  ];
  for (const [id, name, dob] of dobs) await setDob(id, name, dob);

  // Zainab: incomplete name on file ("Zainab Noor") vs. the full name given
  // ("Zainab Noor Nazakat Iqbal") — corrected, not treated as a different
  // person (same account, same enrollment/history).
  const zainabId = "0285303e-82f7-4df5-b94c-d991eda17e39";
  const { error: zErr } = await supabase
    .from("profiles")
    .update({ full_name: "Zainab Noor Nazakat Iqbal", date_of_birth: "2015-12-16" })
    .eq("id", zainabId);
  if (zErr) throw new Error(`Failed to update Zainab: ${zErr.message}`);
  console.log("  Name + DOB set: Zainab Noor -> Zainab Noor Nazakat Iqbal, 2015-12-16");

  // Talal A M Awad: no DOB was given — left untouched, noted here so it
  // isn't mistaken for an oversight.
  console.log("  Talal A M Awad: no DOB was provided — left as-is.");
}

// ---------------------------------------------------------------------------
// Phase 2: create the 2 missing AKIS students
// ---------------------------------------------------------------------------
function cleanToken(token) {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "");
}
async function synthesizeEmail(fullName, domain) {
  const tokens = fullName.trim().split(/\s+/).map(cleanToken).filter(Boolean);
  const base = tokens.length >= 2 ? `${tokens[0]}.${tokens[tokens.length - 1]}` : tokens[0] || "student";
  let candidate = `${base}@${domain}`;
  let suffix = 2;
  while (await findProfileIdByEmail(candidate)) {
    candidate = `${base}.${suffix}@${domain}`;
    suffix += 1;
  }
  return candidate;
}
async function generateEnrollmentNumber() {
  const year = new Date().getFullYear();
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  while (true) {
    const suffix = Array.from({ length: 5 }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
    const candidate = `AKIS-${year}-${suffix}`;
    const { data } = await supabase.from("students").select("id").eq("enrollment_number", candidate).maybeSingle();
    if (!data) return candidate;
  }
}

async function createStudent(fullName, dob) {
  const email = await synthesizeEmail(fullName, "alkamalinternational.com");
  const existingId = await findProfileIdByEmail(email);
  if (existingId) {
    console.log(`  ${email} already exists — skipping`);
    return existingId;
  }
  const password = generatePassword(20);
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "student", center_id: AKIS },
  });
  if (createError || !userData.user) throw new Error(`Failed to create ${fullName}: ${createError?.message ?? "unknown error"}`);
  const userId = userData.user.id;
  await supabase.from("profiles").update({ must_change_password: true, date_of_birth: dob }).eq("id", userId);
  const enrollmentNumber = await generateEnrollmentNumber();
  const { error: studentError } = await supabase.from("students").insert({ id: userId, enrollment_number: enrollmentNumber, class_id: null });
  if (studentError) throw new Error(`Failed to save student row for ${fullName}: ${studentError.message}`);
  created.push({ name: fullName, role: "student", email, password, details: enrollmentNumber });
  console.log(`  created student ${fullName} <${email}> (${enrollmentNumber}) — no class assigned yet, place manually`);
  return userId;
}

async function phase2() {
  console.log("\n=== Phase 2: create missing AKIS students ===");
  await createStudent("Rousanda Mountaseryossef", "2020-07-18");
  await createStudent("Qamar Hani Mohamed", "2019-11-14");
}

// ---------------------------------------------------------------------------
// Phase 3: archive the 13 AKIS accounts not on the final list
// ---------------------------------------------------------------------------
async function phase3() {
  console.log("\n=== Phase 3: archive AKIS accounts not on the final list ===");
  const muhammadId = await findProfileIdByEmail("muhammad@alkamalinternational.com");
  if (!muhammadId) throw new Error("Could not find muhammad@alkamalinternational.com to attribute the archive action to.");

  const toArchive = [
    ["5fa454b9-2804-4262-a049-42eb5e862551", "Aksa Abdul Rahim Gopang Abdul Rahim Gopang"],
    ["cbfbb751-55f4-4f22-a041-525a91785c39", "Amir Fadi Abdelghaffar Elsayed Mohammed"],
    ["7e4e9a1b-40d3-42e4-a8fe-14f3f305d28b", "Aysha Noor"],
    ["12b8cd18-33b3-4038-8c62-ee1dfe50316d", "Eiman Fatima Muhammad Haseeb"],
    ["139b50a2-91c6-4a16-a5aa-298936852b39", "Esra Shinaey Khan"],
    ["02904ff4-c780-4c7a-b541-c4c910484e21", "Khushi Abdul Rahim Gopang Abdul Rahim Gopang"],
    ["362e17da-a5fc-415e-8e06-52525b8967a2", "Lya Radwan Ammouri"],
    ["5b3a948f-a615-4b25-b4a8-0b785154980a", "Muhammad Nasir Taer"],
    ["076db3e3-2e07-4457-af36-08821e2e4a18", "Talin Radwan Ammouri"],
    ["3e0014d7-302b-47aa-bfdf-e74acfc114e2", "Yamariam Zekeke Haliu"],
    ["3c5bc665-71e9-49d9-a6ee-394e3249e1de", "Yousef Mohammad Gandiw Zacarias"],
    ["8130a1a2-75ce-4875-b6e2-a6a609c01c23", "Zayed Abdulaziz Osman"],
    ["89db402f-50dd-4e97-8a63-848b899101aa", "Zywa Mehboob"],
  ];

  for (const [id, name] of toArchive) {
    const { data: profile } = await supabase.from("profiles").select("is_active, archived_at").eq("id", id).maybeSingle();
    if (!profile) {
      console.log(`  ${name}: profile not found — skipping`);
      continue;
    }
    if (profile.archived_at) {
      console.log(`  ${name}: already archived — skipping`);
      continue;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: false, archived_at: new Date().toISOString(), archived_by: muhammadId })
      .eq("id", id);
    if (updateError) throw new Error(`Failed to archive ${name}: ${updateError.message}`);

    const { error: banError } = await supabase.auth.admin.updateUserById(id, { ban_duration: "876000h" });
    if (banError) console.warn(`  WARNING: could not ban ${name} at the Auth level: ${banError.message}`);

    await supabase.from("audit_logs").insert({
      actor_id: muhammadId,
      action: "archive_account",
      target_table: "profiles",
      target_id: id,
      details: { full_name: name, reason: "Not on Muhammad's confirmed AKIS roster (chat, 2026-08-25)" },
    });
    console.log(`  archived: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 4: AKET classes + subjects
// ---------------------------------------------------------------------------
async function ensureClass(name, section) {
  const { data: existing } = await supabase.from("classes").select("id").eq("center_id", AKET).eq("name", name).eq("section", section).maybeSingle();
  if (existing) {
    console.log(`  class "${name} - ${section}" already exists`);
    return existing.id;
  }
  const { data, error } = await supabase.from("classes").insert({ name, section, center_id: AKET }).select("id").single();
  if (error) throw new Error(`Failed to create class ${name}: ${error.message}`);
  console.log(`  created class "${name} - ${section}"`);
  return data.id;
}

async function ensureSubject(name, code) {
  const { data: existing } = await supabase.from("subjects").select("id").eq("center_id", AKET).eq("code", code).maybeSingle();
  if (existing) {
    console.log(`  subject "${name}" (${code}) already exists`);
    return existing.id;
  }
  const { data, error } = await supabase.from("subjects").insert({ name, code, center_id: AKET }).select("id").single();
  if (error) throw new Error(`Failed to create subject ${name}: ${error.message}`);
  console.log(`  created subject "${name}" (${code})`);
  return data.id;
}

async function phase4() {
  console.log("\n=== Phase 4: AKET classes + subjects ===");
  const classIds = {
    level2: await ensureClass("Level 2", "A"),
    level3: await ensureClass("Level 3", "A"),
  };
  const subjectIds = {
    arabic: await ensureSubject("Arabic", "ARB"),
    islamic: await ensureSubject("Islamic Studies", "ISL"),
    english: await ensureSubject("English", "ENG"),
    maths: await ensureSubject("Mathematics", "MATH"),
    science: await ensureSubject("Science", "SCI"),
  };
  return { classIds, subjectIds };
}

// ---------------------------------------------------------------------------
// Phase 5: AKET teachers + assignments
// ---------------------------------------------------------------------------
async function nextAketEmployeeId() {
  const { data } = await supabase.from("teachers").select("employee_id").like("employee_id", "AKET-EMP-%");
  const nums = (data ?? []).map((t) => parseInt(t.employee_id.replace("AKET-EMP-", ""), 10)).filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `AKET-EMP-${String(next).padStart(2, "0")}`;
}

async function createTeacher(fullName, title) {
  const email = await synthesizeEmail(fullName, "alkamaleducation.com");
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
    user_metadata: { full_name: fullName, role: "teacher", center_id: AKET },
  });
  if (createError || !userData.user) throw new Error(`Failed to create ${fullName}: ${createError?.message ?? "unknown error"}`);
  const userId = userData.user.id;
  await supabase.from("profiles").update({ must_change_password: true, title: title ?? null }).eq("id", userId);
  const employeeId = await nextAketEmployeeId();
  const { error: teacherError } = await supabase.from("teachers").insert({ id: userId, employee_id: employeeId });
  if (teacherError) throw new Error(`Failed to save teacher row for ${fullName}: ${teacherError.message}`);
  created.push({ name: fullName, role: "teacher", email, password, details: `${employeeId}${title ? ` — ${title}` : ""}` });
  console.log(`  created teacher ${fullName} <${email}> (${employeeId})`);
  return userId;
}

async function assign(classId, subjectId, teacherId, label) {
  const { data: existing } = await supabase
    .from("class_subject_teachers")
    .select("id")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (existing) {
    const { data: current } = await supabase.from("class_subject_teachers").select("teacher_id").eq("id", existing.id).single();
    if (current?.teacher_id === teacherId) {
      console.log(`  ${label} already assigned — skipping`);
      return;
    }
    const { error: updateError } = await supabase.from("class_subject_teachers").update({ teacher_id: teacherId }).eq("id", existing.id);
    if (updateError) throw new Error(`Failed to reassign ${label}: ${updateError.message}`);
    console.log(`  reassigned ${label}`);
    return;
  }
  const { error } = await supabase.from("class_subject_teachers").insert({ class_id: classId, subject_id: subjectId, teacher_id: teacherId });
  if (error) throw new Error(`Failed to assign ${label}: ${error.message}`);
  console.log(`  assigned ${label}`);
}

async function phase5(classIds, subjectIds) {
  console.log("\n=== Phase 5: AKET teachers + assignments ===");

  // Autism Teacher — account only, no class/subject/student assignment
  // (none specified; use /admin/autism to pair her with a student once the
  // in-person evaluation happens).
  await createTeacher("Arathy Jose Gregorious Bindhu", "Special Needs Teacher");

  // No level/subject given for Priyanga — account only, flagged for
  // Muhammad to fill in later.
  await createTeacher("Priyanga Cholakkal Sudhakaran Cholakkal");

  const shaguftaId = await createTeacher("Shagufta Bibi Qaisar Rasheed");
  const zohraId = await createTeacher("Zohra Elallali");

  console.log("\n  class_subject_teachers:");
  await assign(classIds.level3, subjectIds.english, shaguftaId, "Shagufta / Level 3 / English");
  await assign(classIds.level3, subjectIds.maths, shaguftaId, "Shagufta / Level 3 / Maths");
  await assign(classIds.level3, subjectIds.science, shaguftaId, "Shagufta / Level 3 / Science");
  await assign(classIds.level2, subjectIds.arabic, zohraId, "Zohra / Level 2 / Arabic");
  await assign(classIds.level2, subjectIds.islamic, zohraId, "Zohra / Level 2 / Islamic");
}

// ---------------------------------------------------------------------------
// Phase 6: Fathima Azna Azmi (AKIS, already exists) -> Grade 2, 5 subjects
// ---------------------------------------------------------------------------
async function phase6() {
  console.log("\n=== Phase 6: Fathima Azna Azmi -> AKIS Grade 2 ===");
  const fathimaId = await findProfileIdByEmail("fathimazmi@gmail.com");
  if (!fathimaId) {
    console.warn("  WARNING: fathimazmi@gmail.com not found — skipping.");
    return;
  }
  const { data: grade2 } = await supabase.from("classes").select("id").eq("center_id", AKIS).ilike("name", "%Grade 2%").maybeSingle();
  if (!grade2) {
    console.warn("  WARNING: could not find the AKIS Grade 2 class — skipping.");
    return;
  }
  const subjectCodes = { english: "ENG", maths: "MATH", science: "SCI", ict: "CS", sst: "SOC" };
  const subjectIds = {};
  for (const [key, code] of Object.entries(subjectCodes)) {
    const { data } = await supabase.from("subjects").select("id").eq("center_id", AKIS).eq("code", code).single();
    subjectIds[key] = data?.id;
  }
  await assign(grade2.id, subjectIds.english, fathimaId, "Fathima / Grade 2 / English");
  await assign(grade2.id, subjectIds.maths, fathimaId, "Fathima / Grade 2 / Maths");
  await assign(grade2.id, subjectIds.science, fathimaId, "Fathima / Grade 2 / Science");
  await assign(grade2.id, subjectIds.ict, fathimaId, "Fathima / Grade 2 / ICT");
  await assign(grade2.id, subjectIds.sst, fathimaId, "Fathima / Grade 2 / SST");
}

// ---------------------------------------------------------------------------
async function main() {
  await phase1();
  await phase2();
  await phase3();
  const { classIds, subjectIds } = await phase4();
  await phase5(classIds, subjectIds);
  await phase6();

  if (created.length > 0) {
    console.log("\n=== New accounts created — relay these credentials directly, never store them ===");
    for (const c of created) {
      console.log(`${c.role.padEnd(8)} ${c.name.padEnd(40)} ${c.email.padEnd(40)} ${c.password}  (${c.details})`);
    }
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
