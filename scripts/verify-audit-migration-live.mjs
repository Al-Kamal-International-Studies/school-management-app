#!/usr/bin/env node
// Live check of supabase/migrations/0043_audit_hardening.sql against the REAL
// database, using the disposable audit accounts (create-audit-fixtures.mjs).
// Each probe attempts an exploit / a legitimate action as an audit user and
// reports whether the database behaves correctly. Run it BEFORE applying 0043
// (the FAILs show the holes are currently open) and AFTER (everything should
// PASS):
//
//   node scripts/create-audit-fixtures.mjs
//   node scripts/verify-audit-migration-live.mjs
//   node scripts/delete-audit-fixtures.mjs --execute
//
// Every row a probe creates is deleted again before the script exits.

import { createClient } from "@supabase/supabase-js";
import { admin, readAccounts, SUPABASE_URL, ANON_KEY, AKET_CENTER_ID } from "./audit-common.mjs";

const { accounts, classA, assignmentId } = readAccounts();

async function clientFor(key) {
  const c = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: accounts[key].email, password: accounts[key].password });
  if (error) throw new Error(`sign in ${key}: ${error.message}`);
  return c;
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   <-- ${detail}`}`);
};

const student = await clientFor("student");
const student2 = await clientFor("student2");
const teacher = await clientFor("teacher");
const adminClient = await clientFor("admin");
const cleanup = [];

try {
  // 1. students: a student sees only themselves (not 40+ other children's guardian data)
  {
    const { data, error } = await student.from("students").select("id");
    check("students: a student can read ONLY their own row", !error && data.length === 1, `saw ${data?.length} rows`);
  }

  // 2. assignment_submissions: self-graded INSERT must be refused
  {
    const { data, error } = await student2.from("assignment_submissions").insert({
      assignment_id: assignmentId, student_id: accounts.student2.id, status: "graded", grade: 99, feedback: "[AUDIT] forged",
    }).select("id");
    // Delete the forged row right away (it would collide with the next probe's seeded row).
    if (!error && data?.[0]) await admin.from("assignment_submissions").delete().eq("id", data[0].id);
    check("submissions: a student CANNOT insert a pre-graded submission", !!error, "insert succeeded");
  }

  // 3. assignment_submissions: normal submit + teacher grade must WORK (broken by "infinite recursion" before 0043)
  {
    const { data: seeded } = await admin.from("assignment_submissions").insert({
      assignment_id: assignmentId, student_id: accounts.student2.id, status: "pending",
    }).select("id").single();
    if (!seeded) throw new Error("could not seed a pending submission");
    cleanup.push(() => admin.from("assignment_submissions").delete().eq("id", seeded.id));
    const submit = await student2.from("assignment_submissions").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", seeded.id).select("id");
    check("submissions: a student CAN submit their own work", !submit.error && submit.data?.length === 1, submit.error?.message ?? "0 rows updated");
    const grade = await teacher.from("assignment_submissions").update({ status: "graded", grade: 77 }).eq("id", seeded.id).select("id");
    check("submissions: the teacher CAN grade it", !grade.error && grade.data?.length === 1, grade.error?.message ?? "0 rows updated");
    const selfGrade = await student2.from("assignment_submissions").update({ grade: 100 }).eq("id", seeded.id).select("id");
    check("submissions: the student CANNOT change a graded submission", !!selfGrade.error || selfGrade.data?.length === 0, "update succeeded");
  }

  // 4. profile_center_access: an AKIS-only admin must not grant themselves AKET
  {
    const { data, error } = await adminClient.from("profile_center_access").insert({ profile_id: accounts.admin.id, center_id: AKET_CENTER_ID }).select("id");
    if (!error && data?.[0]) cleanup.push(() => admin.from("profile_center_access").delete().eq("id", data[0].id));
    check("centers: an AKIS-only admin CANNOT self-grant AKET access", !!error, "grant succeeded");
  }

  // 5. leave_requests: a student cannot create an already-approved request
  {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await student.from("leave_requests").insert({
      student_id: accounts.student.id, reason: "[AUDIT] forged", start_date: today, end_date: today, status: "approved",
    }).select("id");
    if (!error && data?.[0]) cleanup.push(() => admin.from("leave_requests").delete().eq("id", data[0].id));
    check("leave: a student CANNOT file an already-approved request", !!error, "insert succeeded");
  }

  // 6. avatar_url: only this project's avatars bucket
  {
    const { error } = await student.from("profiles").update({ avatar_url: "http://127.0.0.1:9/ssrf" }).eq("id", accounts.student.id);
    check("profiles: avatar_url CANNOT point at an arbitrary host", !!error, "update succeeded");
    if (!error) cleanup.push(() => admin.from("profiles").update({ avatar_url: null }).eq("id", accounts.student.id));
  }

  // 7. admissions: an AKIS-only admin must not see other centers' admissions
  {
    const { data: all } = await admin.from("admissions").select("id, center_id");
    const { data: seen, error } = await adminClient.from("admissions").select("id, center_id");
    const foreign = (all ?? []).filter((a) => a.center_id !== "00000000-0000-0000-0000-000000000001").length;
    const leaked = (seen ?? []).filter((a) => a.center_id !== "00000000-0000-0000-0000-000000000001").length;
    check(`admissions: an AKIS-only admin sees no other-center admissions (${foreign} exist)`, !error && leaked === 0, `saw ${leaked} AKET admission(s)`);
  }
} finally {
  for (const run of cleanup.reverse()) {
    try { await run(); } catch (e) { console.error("cleanup step failed:", e.message); }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log(fail ? "Some checks FAIL — if migration 0043 has not been applied yet, that is expected." : "All checks pass — migration 0043 is in effect.");
process.exit(fail ? 1 : 0);
