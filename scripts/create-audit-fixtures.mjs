#!/usr/bin/env node
// One-off: creates the disposable demo accounts + class-scoped sample data
// for the full-app audit (HANDOVER.md Part 33). Same "created and fully
// deleted" precedent as create-qa-fixtures.mjs / create-tutorial-fixtures.mjs.
// Everything here is removed again by scripts/delete-audit-fixtures.mjs.
//
// Before creating anything it writes a BASELINE SNAPSHOT of every table's
// row ids and every storage bucket's object paths to
// scripts/output/audit-baseline.json. The delete script diffs against that
// snapshot so it can remove everything the audit created — including rows
// that survive an auth-user deletion (announcements, events, documents,
// admissions, …: their created_by FK is ON DELETE SET NULL) — without ever
// touching rows that already existed.
//
// The five primary demo accounts (all on AKIS unless noted):
//   admin      audit.admin@…      admin, title "Administrator", AKIS only
//   principal  audit.principal@…  admin, title "Principal", AKIS + AKET
//                                 (there is no separate "principal" role — see
//                                 HANDOVER.md Part 6 §8; Principal = an admin
//                                 account with both centers granted)
//   teacher    audit.teacher@…    homeroom of "Audit Class | Grade 5 A"
//   student    audit.student@…    in that class
//   parent     audit.parent@…     linked to audit.student
// Plus supporting accounts used as authorization-isolation "witnesses" and
// for first-login flows:
//   teacher2, student2 (same class as student), student3 (other class),
//   parent2 (linked to student3), firstlogin (student with every first-login
//   gate still pending: password change, passkey prompt, tour).
//
// Admin/principal get a verified TOTP factor so they can reach aal2 without
// anyone typing a code into a browser. All credentials + TOTP secrets are
// written to scripts/output/audit-accounts.json (gitignored) — never echoed.

import { existsSync } from "node:fs";
import {
  admin, fail, AKIS_CENTER_ID, AKET_CENTER_ID, ACCOUNTS_FILE, BASELINE_FILE,
  generatePassword, makeSsrClient, totpCode, takeSnapshot, writeJson,
} from "./audit-common.mjs";

const DOMAIN = "alkamalinternational.com";
const YEAR = "2026-2027";

if (existsSync(ACCOUNTS_FILE)) fail("audit-accounts.json already exists", new Error("run delete-audit-fixtures.mjs first"));

// --- Baseline snapshot (BEFORE creating anything) ---------------------------
console.log("Taking baseline snapshot of all tables + buckets…");
const baseline = await takeSnapshot();
writeJson(BASELINE_FILE, baseline);
console.log(`  ${Object.keys(baseline.tables).length} tables snapshotted, ${Object.keys(baseline.skipped).length} skipped`, baseline.skipped);
console.log("  rows per table:", Object.fromEntries(Object.entries(baseline.tables).map(([t, r]) => [t, Object.keys(r).length])));

// --- Accounts ---------------------------------------------------------------
const SPEC = [
  { key: "admin", role: "admin", name: "Audit Admin", title: "Administrator", mfa: true },
  { key: "principal", role: "admin", name: "Audit Principal", title: "Principal", mfa: true, aket: true },
  { key: "teacher", role: "teacher", name: "Audit Teacher", emp: "AUDIT-T1" },
  { key: "teacher2", role: "teacher", name: "Audit Teacher Two", emp: "AUDIT-T2" },
  { key: "student", role: "student", name: "Audit Student", enr: "AUDIT-S1", cls: "A" },
  { key: "student2", role: "student", name: "Audit Student Two", enr: "AUDIT-S2", cls: "A" },
  { key: "student3", role: "student", name: "Audit Student Three", enr: "AUDIT-S3", cls: "B" },
  { key: "parent", role: "parent", name: "Audit Parent" },
  { key: "parent2", role: "parent", name: "Audit Parent Two" },
  { key: "firstlogin", role: "student", name: "Audit FirstLogin", enr: "AUDIT-S9", cls: "A", firstLogin: true },
];

const accounts = {};
for (const s of SPEC) {
  const email = `audit.${s.key}@${DOMAIN}`;
  const password = generatePassword(24);
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: s.name, role: s.role, center_id: AKIS_CENTER_ID },
  });
  if (error) fail(`create ${email}`, error);
  accounts[s.key] = { key: s.key, id: data.user.id, email, password, role: s.role, name: s.name };

  const profilePatch = s.firstLogin
    ? { must_change_password: true }
    : { must_change_password: false, passkey_prompt_dismissed_at: new Date().toISOString(), has_seen_tour: true, tour_version_seen: 4 };
  if (s.title) profilePatch.title = s.title;
  const { error: pErr } = await admin.from("profiles").update(profilePatch).eq("id", data.user.id);
  if (pErr) fail(`profile update ${email}`, pErr);

  if (s.aket) {
    const { error: aErr } = await admin.from("profile_center_access").upsert({ profile_id: data.user.id, center_id: AKET_CENTER_ID }, { onConflict: "profile_id,center_id" });
    if (aErr) fail(`AKET grant ${email}`, aErr);
  }
}

// --- Classes, subjects, teachers/students rows --------------------------------
for (const s of SPEC.filter((x) => x.role === "teacher")) {
  const { error } = await admin.from("teachers").insert({ id: accounts[s.key].id, employee_id: s.emp, qualification: "B.Ed." });
  if (error) fail(`teachers insert ${s.key}`, error);
}

async function makeClass(name, section, homeroomKey) {
  const { data, error } = await admin
    .from("classes")
    .insert({ name, section, academic_year: YEAR, center_id: AKIS_CENTER_ID, homeroom_teacher_id: accounts[homeroomKey].id })
    .select("id").single();
  if (error) fail(`class ${name}`, error);
  return data.id;
}
const classA = await makeClass("Audit Class | Grade 5", "A", "teacher");
const classB = await makeClass("Audit Class | Grade 6", "B", "teacher2");

const { data: subjects, error: subErr } = await admin.from("subjects").select("id, code").eq("center_id", AKIS_CENTER_ID).in("code", ["MATH", "ENG", "SCI", "ARB"]);
if (subErr) fail("subjects lookup", subErr);
const subj = Object.fromEntries(subjects.map((s) => [s.code, s.id]));
if (!subj.MATH || !subj.ENG || !subj.SCI || !subj.ARB) fail("subjects", new Error(`missing real subjects, found: ${Object.keys(subj)}`));
{
  const rows = [
    ...["MATH", "ENG", "SCI", "ARB"].map((c) => ({ class_id: classA, subject_id: subj[c], teacher_id: accounts.teacher.id })),
    ...["MATH", "ENG"].map((c) => ({ class_id: classB, subject_id: subj[c], teacher_id: accounts.teacher2.id })),
  ];
  const { error } = await admin.from("class_subject_teachers").insert(rows);
  if (error) fail("class_subject_teachers", error);
}

for (const s of SPEC.filter((x) => x.role === "student")) {
  const classId = s.cls === "A" ? classA : classB;
  const { error } = await admin.from("students").insert({
    id: accounts[s.key].id, enrollment_number: s.enr, class_id: classId, guardian_name: "Audit Guardian",
  });
  if (error) fail(`students insert ${s.key}`, error);
  const { error: eErr } = await admin.from("enrollments").insert({ student_id: accounts[s.key].id, class_id: classId, academic_year: YEAR });
  if (eErr) fail(`enrollments ${s.key}`, eErr);
}

for (const [parent, child] of [["parent", "student"], ["parent2", "student3"]]) {
  const { error } = await admin.from("parent_students").insert({ parent_id: accounts[parent].id, student_id: accounts[child].id });
  if (error) fail(`parent_students ${parent}`, error);
}

// --- MFA for admin + principal -------------------------------------------------
for (const key of ["admin", "principal"]) {
  const acc = accounts[key];
  const { client } = makeSsrClient();
  const { error: sErr } = await client.auth.signInWithPassword({ email: acc.email, password: acc.password });
  if (sErr) fail(`sign in ${key}`, sErr);
  const { data: enr, error: enErr } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "audit" });
  if (enErr) fail(`mfa enroll ${key}`, enErr);
  const { data: ch, error: chErr } = await client.auth.mfa.challenge({ factorId: enr.id });
  if (chErr) fail(`mfa challenge ${key}`, chErr);
  const { error: vErr } = await client.auth.mfa.verify({ factorId: enr.id, challengeId: ch.id, code: totpCode(enr.totp.secret) });
  if (vErr) fail(`mfa verify ${key}`, vErr);
  acc.totpSecret = enr.totp.secret;
}

// --- Sample class-scoped data (so no screen starts empty) ---------------------
// Class-scoped only: nothing here is visible to any real user. Announcements,
// events and documents are deliberately NOT seeded — those broadcast to the
// whole center.
const T1 = accounts.teacher.id;
const S1 = accounts.student.id;
const S2 = accounts.student2.id;
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

{
  const slots = [
    [1, "MATH", "08:00", "08:45"], [1, "ENG", "09:00", "09:45"],
    [2, "SCI", "08:00", "08:45"], [2, "ARB", "09:00", "09:45"],
    [3, "MATH", "08:00", "08:45"], [4, "ENG", "08:00", "08:45"],
  ];
  const { error } = await admin.from("timetable_entries").insert(
    slots.map(([dow, code, st, et]) => ({ class_id: classA, subject_id: subj[code], teacher_id: T1, day_of_week: dow, start_time: st, end_time: et, room: "Room 5A" }))
  );
  if (error) fail("timetable_entries", error);
}
{
  const statuses = ["present", "present", "late", "present", "absent", "present", "excused", "present"];
  const rows = [];
  let offset = -1;
  for (let i = 0; i < statuses.length; offset--) {
    const d = new Date(); d.setDate(d.getDate() + offset);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
    const date = d.toISOString().slice(0, 10);
    rows.push({ student_id: S1, class_id: classA, date, status: statuses[i], marked_by: T1 });
    rows.push({ student_id: S2, class_id: classA, date, status: i % 3 === 0 ? "absent" : "present", marked_by: T1 });
    i++;
  }
  const { error } = await admin.from("attendance_records").insert(rows);
  if (error) fail("attendance_records", error);
}
let asgMath;
{
  const { data, error } = await admin.from("assignments").insert([
    { class_id: classA, subject_id: subj.MATH, teacher_id: T1, title: "Audit homework — fractions", description: "Complete exercises 1-10.", due_date: day(5) },
    { class_id: classA, subject_id: subj.ENG, teacher_id: T1, title: "Audit homework — essay (overdue)", description: "Write a short essay.", due_date: day(-2) },
  ]).select("id, title");
  if (error) fail("assignments", error);
  asgMath = data.find((a) => a.title.includes("fractions")).id;
  const { error: sErr } = await admin.from("assignment_submissions").insert({ assignment_id: asgMath, student_id: S1, status: "submitted", submitted_at: new Date().toISOString() });
  if (sErr) fail("assignment_submissions", sErr);
}
{
  const { data, error } = await admin.from("exams").insert([
    { class_id: classA, subject_id: subj.SCI, teacher_id: T1, title: "Audit science quiz", exam_type: "quiz", exam_date: day(7), start_time: "10:00", room: "Room 5A" },
    { class_id: classA, subject_id: subj.MATH, teacher_id: T1, title: "Audit math midterm", exam_type: "exam", exam_date: day(-10), start_time: "09:00", room: "Hall" },
  ]).select("id, title");
  if (error) fail("exams", error);
  const mid = data.find((e) => e.title.includes("midterm")).id;
  const { error: gErr } = await admin.from("grades").insert([
    { student_id: S1, subject_id: subj.MATH, class_id: classA, teacher_id: T1, exam_id: mid, assessment_name: "Audit math midterm", marks_obtained: 42, marks_total: 50, term: "Term 1" },
    { student_id: S2, subject_id: subj.MATH, class_id: classA, teacher_id: T1, exam_id: mid, assessment_name: "Audit math midterm", marks_obtained: 31, marks_total: 50, term: "Term 1" },
    { student_id: S1, subject_id: subj.ENG, class_id: classA, teacher_id: T1, assessment_name: "Audit spelling test", marks_obtained: 18, marks_total: 20, term: "Term 1" },
  ]);
  if (gErr) fail("grades", gErr);
}
{
  const { error: rErr } = await admin.from("teacher_remarks").insert({ student_id: S1, teacher_id: T1, remark: "Audit remark: participates well in class." });
  if (rErr) fail("teacher_remarks", rErr);
  const { error: bErr } = await admin.from("behaviour_log").insert([
    { student_id: S1, teacher_id: T1, category: "positive", description: "Audit: helped a classmate." },
    { student_id: S1, teacher_id: T1, category: "negative", description: "Audit: late to class." },
  ]);
  if (bErr) fail("behaviour_log", bErr);
}
{
  const month = new Date(); month.setDate(1); month.setMonth(month.getMonth() - 1);
  const m = month.toISOString().slice(0, 10);
  const { error } = await admin.from("monthly_progress_entries").insert(
    ["MATH", "ENG"].map((c) => ({
      student_id: S1, subject_id: subj[c], class_id: classA, teacher_id: T1, month: m,
      attendance_percentage: 92, homework_completion: 85, class_participation: 78, behaviour_conduct: 90,
      assessment_performance: 84, subject_understanding: 80, teacher_comments: "Audit progress entry.", improvement_priority_areas: "Audit: revise fractions.",
    }))
  );
  if (error) fail("monthly_progress_entries", error);
}

writeJson(ACCOUNTS_FILE, {
  createdAt: new Date().toISOString(),
  accounts,
  classA, classB,
  subjects: subj,
  assignmentId: asgMath,
});

console.log(`Created ${Object.keys(accounts).length} accounts, 2 classes, sample data.`);
console.log("Credentials/TOTP secrets: scripts/output/audit-accounts.json (gitignored). Baseline: scripts/output/audit-baseline.json.");
