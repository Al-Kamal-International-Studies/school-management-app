#!/usr/bin/env node
// One-off: creates disposable QA test accounts for a live production
// verification pass, mirroring HANDOVER.md Part 7's "disposable test admin
// account created and fully deleted for that purpose" precedent. Every
// account this script creates is meant to be deleted afterward via
// scripts/delete-qa-fixtures.mjs (or manually) — nothing here is meant to
// persist.
//
// Creates:
//   - 1 admin (qa.admin@alkamalinternational.com), granted BOTH centers'
//     profile_center_access so it can exercise the center switcher and
//     both centers' admin screens.
//   - 1 AKET teacher (qa.teacher@alkamaleducation.com).
//
// Student + parent accounts are deliberately NOT created here — those are
// created live through the Admissions Digitization feature itself as part
// of this same QA pass (that's the point: verify the feature actually
// creates working accounts), not pre-seeded.
//
// Same env-loading / service-role shape as create-admin.mjs.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
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

const AKIS_CENTER_ID = "00000000-0000-0000-0000-000000000001";
const AKET_CENTER_ID = "00000000-0000-0000-0000-000000000002";

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
function generatePassword(length = 20) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

async function createAccount(email, role, fullName, centerId) {
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) {
    console.log(`Already exists, skipping create: ${email}`);
    return { id: existing.id, password: null };
  }
  const password = generatePassword(20);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, center_id: centerId },
  });
  if (error) {
    console.error(`Failed to create ${email}:`, error.message);
    process.exit(1);
  }
  await supabase.from("profiles").update({ must_change_password: false }).eq("id", data.user.id);
  return { id: data.user.id, password };
}

const admin = await createAccount("qa.admin@alkamalinternational.com", "admin", "QA Test Admin", AKIS_CENTER_ID);
if (admin.password) {
  // Grant the second center too so this account can switch and test both.
  await supabase.from("profile_center_access").insert({ profile_id: admin.id, center_id: AKET_CENTER_ID }).select();
  console.log(`Created admin: qa.admin@alkamalinternational.com / ${admin.password} (both centers granted, must_change_password=false for QA convenience)`);
}

const teacher = await createAccount("qa.teacher@alkamaleducation.com", "teacher", "QA Test Teacher", AKET_CENTER_ID);
if (teacher.password) {
  await supabase.from("teachers").insert({ id: teacher.id, employee_id: "QA-TEACH-01" });
  console.log(`Created teacher: qa.teacher@alkamaleducation.com / ${teacher.password}`);
}

console.log("\nDone. Remember: scripts/delete-qa-fixtures.mjs removes everything this script + the admissions test submissions create.");
