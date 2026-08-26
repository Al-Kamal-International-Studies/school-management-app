#!/usr/bin/env node
// Creates a parent account for every active AKIS student that doesn't
// already have one, per Muhammad's explicit naming convention (chat,
// 2026-08-26): parent.<studentfirstname>@alkamalinternational.com for AKIS,
// parent.<studentfirstname>@alkamaleducation.com for AKET. Idempotent, same
// shape as reconcile-rosters.mjs / bulk-onboard.mjs.
//
// Usage: node scripts/create-akis-parents.mjs

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

function generatePassword(length = 20) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

function firstNameToken(fullName) {
  return fullName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "student")
    .eq("center_id", AKIS)
    .is("archived_at", null)
    .order("full_name");

  const { data: links } = await supabase.from("parent_students").select("student_id");
  const linkedIds = new Set((links ?? []).map((l) => l.student_id));

  const created = [];
  for (const student of students ?? []) {
    if (linkedIds.has(student.id)) {
      console.log(`  ${student.full_name}: already has a linked parent — skipping`);
      continue;
    }
    const parentEmail = `parent.${firstNameToken(student.full_name)}@alkamalinternational.com`;
    const { data: existing } = await supabase.from("profiles").select("id").eq("email", parentEmail).maybeSingle();
    let parentId = existing?.id;
    let password = null;

    if (!parentId) {
      password = generatePassword(20);
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: parentEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: `Parent of ${student.full_name.split(/\s+/)[0]}`, role: "parent", center_id: AKIS },
      });
      if (createError || !userData.user) throw new Error(`Failed to create ${parentEmail}: ${createError?.message ?? "unknown error"}`);
      parentId = userData.user.id;
      await supabase.from("profiles").update({ must_change_password: true }).eq("id", parentId);
      console.log(`  created parent account ${parentEmail} for ${student.full_name}`);
    } else {
      console.log(`  ${parentEmail} already existed — linking to ${student.full_name} without recreating`);
    }

    const { error: linkError } = await supabase.from("parent_students").insert({ parent_id: parentId, student_id: student.id });
    if (linkError && !linkError.message.includes("duplicate")) throw new Error(`Failed to link ${parentEmail} to ${student.full_name}: ${linkError.message}`);

    if (password) created.push({ studentName: student.full_name, email: parentEmail, password });
  }

  if (created.length > 0) {
    console.log("\n=== New AKIS parent accounts — relay directly, never store ===");
    for (const c of created) console.log(`${c.email.padEnd(45)} ${c.password}  (parent of ${c.studentName})`);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
