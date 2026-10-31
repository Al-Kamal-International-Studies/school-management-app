#!/usr/bin/env node
// The made-up school Muhammad shows prospects (HANDOVER Part 45). Everything
// lives in the DEMO center added by 0048_demo_center.sql, which RLS walls off
// from AKIS: the demo logins see only these fake people, and AKIS never sees
// them. There is deliberately NO demo admin login — admin pages read AKIS data
// directly (see lib/centers/hasAkisAccess.ts getAppCenterId).
//
//   node scripts/demo-school.mjs            build it (refuses if it already exists)
//   node scripts/demo-school.mjs --reset    unlock the 3 logins, password back to the
//                                           demo one, forget their devices (3-device cap)
//   node scripts/demo-school.mjs --delete   remove every DEMO-center row and account
//
// Logins (shared with the prospect): teacher@ / student@ / parent@demo.alkamal.app,
// password from the DEMO_SCHOOL_PASSWORD env var — never written into this repo,
// which is public during every deploy (same rule as AKIS_STUDENT_PASSWORD,
// Part 44). Every other demo account gets a random password nobody knows. The address domain has no mailbox; Supabase sends nothing on
// admin-created, pre-confirmed users.

import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { readFileSync, existsSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(rootDir, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq !== -1 && !(t.slice(0, eq).trim() in process.env)) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO = "00000000-0000-0000-0000-000000000003";
const DOMAIN = "@demo.alkamal.app";
const DEMO_PASSWORD = process.env.DEMO_SCHOOL_PASSWORD;
const LOGINS = ["teacher" + DOMAIN, "student" + DOMAIN, "parent" + DOMAIN];
const YEAR = "2026-2027";

function fail(label, error) {
  console.error(`${label}: ${error?.message ?? error}`);
  process.exit(1);
}
const must = async (label, p) => {
  const { data, error } = await p;
  if (error) fail(label, error);
  return data;
};

// ---------------------------------------------------------------- the people
// Teachers: [key, email local part, title, full name, employee id, qualification]
const TEACHERS = [
  ["sarah", "teacher", "Ms.", "Sarah Mitchell", "DEMO-T01", "M.Ed. Mathematics"],
  ["daniel", "daniel.brooks", "Mr.", "Daniel Brooks", "DEMO-T02", "B.A. English, PGCE"],
  ["huda", "huda.alnuaimi", "Ms.", "Huda Al Nuaimi", "DEMO-T03", "B.A. Arabic Language"],
  ["ravi", "ravi.menon", "Mr.", "Ravi Menon", "DEMO-T04", "B.Sc. Computer Science"],
];
// Classes and who teaches what in each: [subject code, teacher key]
const CLASSES = [
  { key: "g6", name: "Grade 6", section: "A", homeroom: "sarah", subjects: [["MATH", "sarah"], ["SCI", "sarah"], ["ENG", "daniel"], ["ARB", "huda"], ["ISL", "huda"], ["SST", "ravi"], ["ICT", "ravi"]] },
  { key: "g3", name: "Grade 3", section: "B", homeroom: "daniel", subjects: [["MATH", "sarah"], ["ENG", "daniel"], ["ARB", "huda"], ["SCI", "ravi"], ["ICT", "ravi"]] },
];
const SUBJECTS = { MATH: "Mathematics", SCI: "Science", ENG: "English", ARB: "Arabic", ISL: "Islamic Studies", SST: "Social Studies", ICT: "ICT" };
// Students: [email local part, full name, class key, gender]
const STUDENTS = [
  ["student", "Zayed Al Hammadi", "g6", "male"],
  ["mira.haddad", "Mira Haddad", "g6", "female"],
  ["lucas.fernandes", "Lucas Fernandes", "g6", "male"],
  ["noor.abdullah", "Noor Abdullah", "g6", "female"],
  ["ethan.park", "Ethan Park", "g6", "male"],
  ["salma.rashed", "Salma Rashed", "g6", "female"],
  ["arjun.nair", "Arjun Nair", "g6", "male"],
  ["hessa.alketbi", "Hessa Al Ketbi", "g6", "female"],
  ["leo.martin", "Leo Martin", "g6", "male"],
  ["fatima.qasim", "Fatima Qasim", "g6", "female"],
  ["kenji.sato", "Kenji Sato", "g6", "male"],
  ["amira.youssef", "Amira Youssef", "g6", "female"],
  ["maryam.alhammadi", "Maryam Al Hammadi", "g3", "female"],
  ["omar.siddiqui", "Omar Siddiqui", "g3", "male"],
  ["chloe.dubois", "Chloe Dubois", "g3", "female"],
  ["yousef.karim", "Yousef Karim", "g3", "male"],
  ["lina.saleh", "Lina Saleh", "g3", "female"],
  ["adam.wright", "Adam Wright", "g3", "male"],
];
const PARENT = ["parent", "Khalid Al Hammadi", ["student", "maryam.alhammadi"]];

// Deterministic "random" so a rebuild looks the same
let seed = 20261031;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// ------------------------------------------------------------------- modes
async function demoProfiles() {
  return must("list demo profiles", supabase.from("profiles").select("id, email, role").eq("center_id", DEMO));
}

async function resetLogins() {
  const profiles = (await demoProfiles()).filter((p) => LOGINS.includes(p.email));
  for (const p of profiles) {
    await must(`unlock ${p.email}`, supabase.from("profiles").update({ is_active: true, failed_login_attempts: 0, must_change_password: false }).eq("id", p.id));
    await must(`password ${p.email}`, supabase.auth.admin.updateUserById(p.id, { password: DEMO_PASSWORD, ban_duration: "none" }));
    await must(`devices ${p.email}`, supabase.from("user_devices").delete().eq("user_id", p.id));
    await supabase.from("webauthn_credentials").delete().eq("user_id", p.id);
  }
  console.log(`Reset ${profiles.length} demo logins (unlocked, password restored, devices and passkeys cleared).`);
}

async function deleteAll() {
  const profiles = await demoProfiles();
  const stray = profiles.filter((p) => !p.email.endsWith(DOMAIN));
  if (stray.length) fail("refusing to delete", `DEMO center holds accounts outside ${DOMAIN}: ${stray.map((p) => p.email).join(", ")}`);
  const { data: docs } = await supabase.from("documents").select("file_path").eq("center_id", DEMO);
  if (docs?.length) await supabase.storage.from("documents").remove(docs.map((d) => d.file_path));
  for (const t of ["documents", "announcements", "events", "feedback", "classes", "subjects"]) {
    await must(`delete ${t}`, supabase.from(t).delete().eq("center_id", DEMO));
  }
  // safety-filter flags would otherwise outlive their (set-null) sender
  if (profiles.length) await must("delete message flags", supabase.from("message_flags").delete().in("sender_id", profiles.map((p) => p.id)));
  for (const p of profiles) await must(`delete ${p.email}`, supabase.auth.admin.deleteUser(p.id));
  console.log(`Deleted the demo school: ${profiles.length} accounts and every DEMO-center row.`);
}

// ------------------------------------------------------------------- build
async function build() {
  if ((await demoProfiles()).length) fail("demo school already exists", "run with --delete first (or --reset to just unlock the logins)");
  const { data: center } = await supabase.from("centers").select("id").eq("id", DEMO).maybeSingle();
  if (!center) fail("DEMO center missing", "apply supabase/migrations/0048_demo_center.sql first");

  // No fake name may coincide with a real person's
  const names = [...TEACHERS.map((t) => t[3]), ...STUDENTS.map((s) => s[1]), PARENT[1]];
  const clash = await must("name check", supabase.from("profiles").select("full_name").in("full_name", names));
  if (clash.length) fail("name clash with an existing account", clash.map((c) => c.full_name).join(", "));

  async function account(local, role, fullName, extra = {}) {
    const email = local + DOMAIN;
    const password = LOGINS.includes(email) ? DEMO_PASSWORD : randomBytes(24).toString("base64url");
    const { user } = await must(`create ${email}`, supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName, role, center_id: DEMO },
    }));
    await must(`profile ${email}`, supabase.from("profiles").update({ must_change_password: false, ...extra }).eq("id", user.id));
    return user.id;
  }

  const now = new Date().toISOString();
  const T = {};
  for (const [key, local, title, name, emp, qual] of TEACHERS) {
    T[key] = await account(local, "teacher", name, { title, phone: "+971 50 000 01" + emp.slice(-2), passkey_prompt_dismissed_at: now });
    await must("teacher row", supabase.from("teachers").insert({ id: T[key], employee_id: emp, qualification: qual, joining_date: "2023-08-20" }));
  }

  const subjectIds = {};
  for (const [code, name] of Object.entries(SUBJECTS)) {
    subjectIds[code] = (await must("subject", supabase.from("subjects").insert({ name, code: `D-${code}`, center_id: DEMO }).select("id").single())).id;
  }

  const C = {};
  for (const c of CLASSES) {
    const row = await must("class", supabase.from("classes").insert({ name: c.name, section: c.section, academic_year: YEAR, center_id: DEMO, homeroom_teacher_id: T[c.homeroom] }).select("id").single());
    C[c.key] = { ...c, id: row.id, students: [] };
    // inserting a class subject also creates its group chat (0046 trigger)
    await must("cst", supabase.from("class_subject_teachers").insert(c.subjects.map(([code, t]) => ({ class_id: row.id, subject_id: subjectIds[code], teacher_id: T[t] }))));
  }

  const S = {};
  let n = 0;
  for (const [local, name, cls, gender] of STUDENTS) {
    const dob = `${cls === "g6" ? 2014 : 2017}-${String(1 + (n % 12)).padStart(2, "0")}-${String(3 + n).padStart(2, "0")}`;
    S[local] = await account(local, "student", name, { date_of_birth: dob });
    const surname = name.split(" ").slice(1).join(" ");
    await must("student row", supabase.from("students").insert({
      id: S[local], enrollment_number: `DEMO-${String(++n).padStart(3, "0")}`, class_id: C[cls].id,
      guardian_name: local === "student" || local === "maryam.alhammadi" ? PARENT[1] : `Mr. ${surname}`,
      guardian_phone: `+971 50 000 02${String(n).padStart(2, "0")}`, address: "Demo Street, Abu Dhabi",
      emergency_contact_name: `${surname} family`, emergency_contact_phone: `+971 50 000 03${String(n).padStart(2, "0")}`, emergency_contact_relationship: "Guardian",
    }));
    await must("enrollment", supabase.from("enrollments").insert({ student_id: S[local], class_id: C[cls].id, academic_year: YEAR }));
    C[cls].students.push({ id: S[local], gender });
  }

  const parentId = await account(PARENT[0], "parent", PARENT[1], { phone: "+971 50 000 0400" });
  await must("parent links", supabase.from("parent_students").insert(PARENT[2].map((s) => ({ parent_id: parentId, student_id: S[s] }))));

  // Timetable: Mon-Fri, six periods; no teacher in two rooms at once (0044 also enforces it)
  const PERIODS = [["07:45", "08:30"], ["08:30", "09:15"], ["09:15", "10:00"], ["10:20", "11:05"], ["11:05", "11:50"], ["11:50", "12:35"]];
  const tt = [];
  for (let day = 1; day <= 5; day++) {
    PERIODS.forEach(([start, end], p) => {
      const busy = new Set();
      for (const [i, c] of CLASSES.entries()) {
        for (let k = 0; k < c.subjects.length; k++) {
          const [code, t] = c.subjects[(day * 3 + p + i * 2 + k) % c.subjects.length];
          if (busy.has(t)) continue;
          busy.add(t);
          tt.push({ class_id: C[c.key].id, subject_id: subjectIds[code], teacher_id: T[t], day_of_week: day, start_time: start, end_time: end, room: `Room ${i === 0 ? "6" : "3"}${c.section}` });
          break;
        }
      }
    });
  }
  await must("timetable", supabase.from("timetable_entries").insert(tt));

  // Attendance: every school day since term start
  const today = new Date("2026-10-30T00:00:00Z");
  const att = [];
  for (let d = new Date("2026-09-01T00:00:00Z"); d <= today; d = addDays(d, 1)) {
    if ([0, 6].includes(d.getUTCDay())) continue;
    for (const c of Object.values(C)) {
      for (const s of c.students) {
        const r = rand();
        att.push({ student_id: s.id, class_id: c.id, date: iso(d), status: r < 0.9 ? "present" : r < 0.95 ? "late" : r < 0.985 ? "absent" : "excused", marked_by: T[c.homeroom] });
      }
    }
  }
  for (let i = 0; i < att.length; i += 500) await must("attendance", supabase.from("attendance_records").insert(att.slice(i, i + 500)));

  // Exams, grades, assignments, progress — per class subject
  const grades = [], subs = [], progress = [];
  for (const c of Object.values(C)) {
    for (const [code, t] of c.subjects) {
      const base = { class_id: c.id, subject_id: subjectIds[code], teacher_id: T[t] };
      const [mid] = await must("exams", supabase.from("exams").insert([
        { ...base, title: `${SUBJECTS[code]} Midterm`, exam_type: "exam", exam_date: "2026-10-14", start_time: "08:30", room: "Exam Hall" },
        { ...base, title: `${SUBJECTS[code]} Quiz 3`, exam_type: "quiz", exam_date: "2026-11-11", start_time: "09:15", room: c.key === "g6" ? "Room 6A" : "Room 3B" },
        { ...base, title: `${SUBJECTS[code]} Final Exam`, exam_type: "exam", exam_date: "2026-12-09", start_time: "08:00", room: "Exam Hall" },
      ]).select("id"));
      const asg = await must("assignments", supabase.from("assignments").insert([
        { ...base, title: `${SUBJECTS[code]}: Chapter 3 worksheet`, description: "Complete all questions and show your working.", due_date: "2026-10-09" },
        { ...base, title: `${SUBJECTS[code]}: Mini project`, description: "Work in pairs. Present your findings in class.", due_date: "2026-10-28" },
        { ...base, title: `${SUBJECTS[code]}: Revision exercise`, description: "Revise units 1-4 before the quiz.", due_date: "2026-11-07" },
      ]).select("id, due_date"));
      for (const s of c.students) {
        const skill = 0.55 + rand() * 0.4;
        const q1 = Math.min(20, Math.round(20 * (skill + (rand() - 0.5) * 0.15)));
        const q2 = Math.min(20, Math.round(20 * (skill + (rand() - 0.5) * 0.15)));
        const m = Math.min(100, Math.round(100 * (skill + (rand() - 0.5) * 0.1)));
        grades.push(
          { ...base, student_id: s.id, assessment_name: "Quiz 1", marks_obtained: q1, marks_total: 20, term: "Term 1" },
          { ...base, student_id: s.id, assessment_name: "Quiz 2", marks_obtained: q2, marks_total: 20, term: "Term 1" },
          { ...base, student_id: s.id, exam_id: mid.id, assessment_name: "Midterm", marks_obtained: m, marks_total: 100, term: "Term 1" },
        );
        subs.push(
          { assignment_id: asg[0].id, student_id: s.id, status: "graded", submitted_at: "2026-10-08T15:00:00Z", grade: Math.round(10 * skill), feedback: skill > 0.8 ? "Excellent work!" : skill > 0.65 ? "Good effort, check question 4." : "Please see me about the method." },
          { assignment_id: asg[1].id, student_id: s.id, status: rand() < 0.8 ? "submitted" : "pending", submitted_at: "2026-10-27T17:30:00Z" },
        );
        for (const month of ["2026-09-01", "2026-10-01"]) {
          const v = () => Math.max(40, Math.min(100, Math.round(100 * (skill + (rand() - 0.4) * 0.2))));
          progress.push({ ...base, student_id: s.id, month, attendance_percentage: v(), homework_completion: v(), class_participation: v(), behaviour_conduct: v(), assessment_performance: v(), subject_understanding: v(),
            teacher_comments: skill > 0.75 ? "Consistently strong; ready for extension tasks." : "Making steady progress; keep practising at home.",
            improvement_priority_areas: skill > 0.75 ? "Presenting answers neatly" : "Reading questions carefully" });
        }
      }
    }
  }
  for (let i = 0; i < grades.length; i += 500) await must("grades", supabase.from("grades").insert(grades.slice(i, i + 500)));
  await must("submissions", supabase.from("assignment_submissions").insert(subs.map((s) => (s.status === "pending" ? { ...s, submitted_at: null } : s))));
  await must("progress", supabase.from("monthly_progress_entries").insert(progress));

  await must("remarks", supabase.from("teacher_remarks").insert([
    { student_id: S.student, teacher_id: T.sarah, remark: "Zayed explains his reasoning clearly and helps classmates during group work." },
    { student_id: S["mira.haddad"], teacher_id: T.sarah, remark: "Mira's science fair idea on water filtration is very promising." },
    { student_id: S["maryam.alhammadi"], teacher_id: T.daniel, remark: "Maryam reads fluently and loves our library sessions." },
  ]));
  await must("behaviour", supabase.from("behaviour_log").insert([
    { student_id: S.student, teacher_id: T.sarah, category: "positive", description: "Volunteered to lead the class recycling drive." },
    { student_id: S["lucas.fernandes"], teacher_id: T.daniel, category: "negative", description: "Homework missing twice this week." },
    { student_id: S["noor.abdullah"], teacher_id: T.huda, category: "positive", description: "Beautiful Quran recitation at assembly." },
  ]));
  await must("leave", supabase.from("leave_requests").insert([
    { student_id: S.student, reason: "Family travel for a wedding.", start_date: "2026-10-12", end_date: "2026-10-13", status: "approved" },
    { student_id: S["maryam.alhammadi"], reason: "Dentist appointment in the morning.", start_date: "2026-11-04", end_date: "2026-11-04", status: "pending" },
  ]));

  await must("announcements", supabase.from("announcements").insert([
    { title: "Welcome to Term 1", body: "Welcome back, everyone! Timetables and class groups are now live in the app. Please check your schedule and say hello in your subject chats.", audience: "all", center_id: DEMO, created_by: T.sarah },
    { title: "Parent-teacher meetings", body: "Meetings are on Thursday 13 November, 3:00-6:00 pm. Book a slot with your child's homeroom teacher by messaging them here.", audience: "parent", center_id: DEMO, created_by: T.sarah },
    { title: "Science Fair 2026", body: "Grades 3-6 can register projects until 20 November. Ask your science teacher for the project guidelines.", audience: "student", center_id: DEMO, created_by: T.sarah },
    { title: "Staff briefing moved", body: "This week's staff briefing moves to Wednesday at 7:15 am in the library.", audience: "teacher", center_id: DEMO, created_by: T.sarah },
  ]));
  await must("events", supabase.from("events").insert([
    { title: "Parent-teacher meetings", description: "3:00-6:00 pm, homeroom classrooms.", event_date: "2026-11-13", event_type: "event", audience: "all", center_id: DEMO, created_by: T.sarah },
    { title: "Science Fair", description: "Projects on display in the main hall.", event_date: "2026-11-26", event_type: "event", audience: "all", center_id: DEMO, created_by: T.sarah },
    { title: "Science Fair registration closes", event_date: "2026-11-20", event_type: "deadline", audience: "student", center_id: DEMO, created_by: T.sarah },
    { title: "UAE National Day holiday", description: "School closed.", event_date: "2026-12-02", event_type: "holiday", audience: "all", center_id: DEMO, created_by: T.sarah },
    { title: "Term 1 final exams begin", event_date: "2026-12-07", event_type: "deadline", audience: "all", center_id: DEMO, created_by: T.sarah },
  ]));

  // One downloadable document (a generated one-page PDF)
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const lines = ["Student Handbook 2026-2027 (Demo)", "", "School hours: 7:45 am - 12:35 pm, Monday to Friday.", "Uniform is required every day except Friday (PE kit).", "Absences must be reported through the app by a parent.", "Homework is posted in the app under Assignments.", "", "This is sample content for demonstration purposes."];
  lines.forEach((l, i) => page.drawText(l, { x: 56, y: 770 - i * 24, size: i === 0 ? 18 : 12, font }));
  const filePath = `demo/${randomUUID()}-student-handbook.pdf`;
  await must("upload handbook", supabase.storage.from("documents").upload(filePath, await pdf.save(), { contentType: "application/pdf" }));
  await must("document row", supabase.from("documents").insert({ title: "Student Handbook 2026-2027", category: "policy", audience: "all", file_path: filePath, center_id: DEMO }));

  // Chats: subject groups (already created) and a few direct conversations
  const send = (sender, chat, content) => must("message", supabase.rpc("send_chat_message", { p_sender: sender, p_chat_id: chat, p_content: content, p_client_id: randomUUID() }));
  const groupOf = async (cls, code) => {
    const cst = await must("cst lookup", supabase.from("class_subject_teachers").select("id").eq("class_id", C[cls].id).eq("subject_id", subjectIds[code]).single());
    return (await must("group lookup", supabase.from("chats").select("id").eq("cst_id", cst.id).single())).id;
  };
  const dm = async (a, b) => must("open chat", supabase.rpc("open_direct_chat", { p_me: a, p_other: b }));
  const g6math = await groupOf("g6", "MATH");
  await send(T.sarah, g6math, "Good morning, Grade 6! Today we start fractions. Please bring your geometry sets tomorrow.");
  await send(S["mira.haddad"], g6math, "Good morning Ms. Sarah!");
  await send(S.student, g6math, "Is the Chapter 3 worksheet due Friday?");
  await send(T.sarah, g6math, "Yes, Friday. Today's online revision session: https://meet.google.com/demo-link");
  const g6sci = await groupOf("g6", "SCI");
  await send(T.sarah, g6sci, "Science fair groups are posted. Start thinking about your project question!");
  const g3eng = await groupOf("g3", "ENG");
  await send(T.daniel, g3eng, "Lovely reading today, Grade 3. Library books go home on Thursday.");
  const zayed = await dm(T.sarah, S.student);
  await send(T.sarah, zayed, "Great job on the midterm, Zayed. Would you like to help run the maths club?");
  await send(S.student, zayed, "Yes please! Thank you, Ms. Sarah.");
  const khalid = await dm(T.sarah, parentId);
  await send(parentId, khalid, "Hello Ms. Sarah, Zayed will miss school on 12-13 October for a family wedding.");
  await send(T.sarah, khalid, "Thank you for letting me know, Mr. Khalid. I'll share the worksheet so he can catch up.");

  await must("notifications", supabase.from("notifications").insert([
    { user_id: S.student, type: "assignment", title: "New assignment: Mathematics: Revision exercise", body: "Due 7 November", url: "/student/assignments" },
    { user_id: S.student, type: "exam", title: "Quiz scheduled: Mathematics Quiz 3", body: "11 November, 9:15 am", url: "/student/exams" },
    { user_id: parentId, type: "announcement", title: "Parent-teacher meetings", body: "Thursday 13 November, 3:00-6:00 pm", url: "/parent" },
  ]));

  console.log(`Demo school built in the DEMO center: ${TEACHERS.length} teachers, ${STUDENTS.length} students, 1 parent, ${CLASSES.length} classes, ${tt.length} timetable periods, ${att.length} attendance marks, ${grades.length} grades.`);
  console.log(`Logins: ${LOGINS.join(", ")} (password: DEMO_SCHOOL_PASSWORD).`);
}

const mode = process.argv[2];
if (mode !== "--delete" && !DEMO_PASSWORD) fail("DEMO_SCHOOL_PASSWORD", "set it in the environment first");
if (mode === "--reset") await resetLogins();
else if (mode === "--delete") await deleteAll();
else if (!mode) await build();
else fail("unknown option", mode);
