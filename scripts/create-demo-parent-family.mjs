#!/usr/bin/env node
// Creates a demo AKIS parent account with 2 demo children, so Muhammad can
// test the parent dashboard's multi-child switcher directly (chat,
// 2026-08-26). Clearly named "Demo ..." / demo.*@ so it's obvious later
// which accounts these are and safe to archive/remove once testing is
// done — same "clearly-named test fixture" convention as
// teststudent@/testteacher@/testparent@ (Part 1) and AKET's test.* batch
// (Part 5).
//
// Per explicit instruction: all three accounts get the SAME fixed,
// permanent password (Pass@1234) — no generated temp password, no forced
// change on first login. This is a deliberate, one-off exception to this
// project's normal "always must_change_password" rule for a demo/test
// fixture Muhammad is creating and using himself, not a real family's
// account.
//
// Idempotent — safe to re-run.

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
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AKIS = "00000000-0000-0000-0000-000000000001";
const DEMO_PASSWORD = "Pass@1234";

async function findProfileByEmail(email) {
  const { data } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

async function ensureAccount({ email, fullName, role }) {
  const existingId = await findProfileByEmail(email);
  if (existingId) {
    console.log(`  ${email} already exists — reusing`);
    return existingId;
  }
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, center_id: AKIS },
  });
  if (createError || !userData.user) throw new Error(`Failed to create ${email}: ${createError?.message ?? "unknown error"}`);
  // must_change_password left false — see header comment.
  await supabase.from("profiles").update({ must_change_password: false }).eq("id", userData.user.id);
  console.log(`  created ${role} ${fullName} <${email}>`);
  return userData.user.id;
}

async function generateEnrollmentNumber() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  while (true) {
    const candidate = `DEMO-${Array.from({ length: 5 }, () => charset[Math.floor(Math.random() * charset.length)]).join("")}`;
    const { data } = await supabase.from("students").select("id").eq("enrollment_number", candidate).maybeSingle();
    if (!data) return candidate;
  }
}

async function ensureDemoStudent(email, fullName, dob, className, classId) {
  const id = await ensureAccount({ email, fullName, role: "student" });
  const { data: existing } = await supabase.from("students").select("id").eq("id", id).maybeSingle();
  if (existing) {
    console.log(`  ${fullName}: students row already exists — leaving as-is`);
    return id;
  }
  const enrollmentNumber = await generateEnrollmentNumber();
  const { error } = await supabase.from("students").insert({
    id,
    enrollment_number: enrollmentNumber,
    class_id: classId,
  });
  if (error) throw new Error(`Failed to save student row for ${fullName}: ${error.message}`);
  // date_of_birth lives on `profiles`, not `students` (0003_profile_and_avatars.sql
  // moved it early in this project's history — see HANDOVER.md Part 12 §6's
  // own note about this exact gotcha).
  await supabase.from("profiles").update({ date_of_birth: dob }).eq("id", id);
  const { error: enrollError } = await supabase.from("enrollments").upsert(
    { student_id: id, class_id: classId, academic_year: "2026" },
    { onConflict: "student_id,academic_year" }
  );
  if (enrollError) console.warn(`  enrollment warning for ${fullName}: ${enrollError.message}`);
  console.log(`  ${fullName}: placed in ${className}, enrollment ${enrollmentNumber}`);
  return id;
}

async function main() {
  console.log("=== Demo parent ===");
  const parentId = await ensureAccount({ email: "demo.parent@alkamalinternational.com", fullName: "Demo Parent", role: "parent" });

  console.log("\n=== Demo children ===");
  const { data: grade1 } = await supabase.from("classes").select("id, name, section").eq("center_id", AKIS).ilike("name", "%Grade 1%").single();
  const { data: grade3 } = await supabase.from("classes").select("id, name, section").eq("center_id", AKIS).ilike("name", "%Grade 3%").single();

  const child1Id = await ensureDemoStudent(
    "demo.child1@alkamalinternational.com",
    "Demo Child One",
    "2018-05-10",
    `${grade1.name} - ${grade1.section}`,
    grade1.id
  );
  const child2Id = await ensureDemoStudent(
    "demo.child2@alkamalinternational.com",
    "Demo Child Two",
    "2016-09-22",
    `${grade3.name} - ${grade3.section}`,
    grade3.id
  );

  console.log("\n=== Linking children to the demo parent ===");
  for (const childId of [child1Id, child2Id]) {
    const { data: existingLink } = await supabase.from("parent_students").select("id").eq("parent_id", parentId).eq("student_id", childId).maybeSingle();
    if (existingLink) {
      console.log(`  ${childId}: already linked — skipping`);
      continue;
    }
    const { error } = await supabase.from("parent_students").insert({ parent_id: parentId, student_id: childId });
    if (error) throw new Error(`Failed to link demo parent to ${childId}: ${error.message}`);
    console.log(`  linked ${childId} to demo.parent@alkamalinternational.com`);
  }

  console.log("\n=== Demo login — same permanent password for all three ===");
  console.log(`demo.parent@alkamalinternational.com  ${DEMO_PASSWORD}  (parent — use this to test the dashboard)`);
  console.log(`demo.child1@alkamalinternational.com  ${DEMO_PASSWORD}  (Demo Child One, ${grade1.name} - ${grade1.section})`);
  console.log(`demo.child2@alkamalinternational.com  ${DEMO_PASSWORD}  (Demo Child Two, ${grade3.name} - ${grade3.section})`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
