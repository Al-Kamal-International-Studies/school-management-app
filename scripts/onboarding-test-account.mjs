#!/usr/bin/env node
// Throwaway teacher account for a signed-in run of the getting-started
// onboarding (HANDOVER Part 62). Same "create, test, fully delete" precedent
// as create-tutorial-fixtures.mjs. Touches only this one account.
//
//   node scripts/onboarding-test-account.mjs           create it
//   node scripts/onboarding-test-account.mjs --reset   onboarding not finished again
//   node scripts/onboarding-test-account.mjs --status  show its onboarding columns
//   node scripts/onboarding-test-account.mjs --delete  delete it (and the output file)
//
// The generated password goes to scripts/output/onboarding-test-account.json
// (gitignored), never to the console.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(rootDir, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!(key in process.env)) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing Supabase env vars in .env.local.");
  process.exit(1);
}
const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const AKIS_CENTER_ID = "00000000-0000-0000-0000-000000000001";
const EMAIL = "onboarding.test@alkamalinternational.com";
const outDir = path.join(rootDir, "scripts", "output");
const outFile = path.join(outDir, "onboarding-test-account.json");

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function generatePassword(length = 20) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

const mode = process.argv[2] ?? "--create";
const { data: existing } = await supabase
  .from("profiles")
  .select("id, has_seen_tour, tour_version_seen")
  .eq("email", EMAIL)
  .maybeSingle();

if (mode === "--status") {
  console.log(existing ? JSON.stringify(existing) : "not found");
  process.exit(0);
}

if (mode === "--delete") {
  if (existing) {
    const { error } = await supabase.auth.admin.deleteUser(existing.id);
    if (error) {
      console.error("delete failed:", error.message);
      process.exit(1);
    }
    console.log(`Deleted ${EMAIL}.`);
  } else console.log(`${EMAIL}: not found.`);
  const { data: left } = await supabase.from("profiles").select("id").eq("email", EMAIL);
  console.log(`Profiles left with that email: ${left?.length ?? "?"}`);
  if (existsSync(outFile)) rmSync(outFile);
  process.exit(0);
}

if (mode === "--reset") {
  if (!existing) {
    console.error("not found");
    process.exit(1);
  }
  const { error } = await supabase.from("profiles").update({ has_seen_tour: false, tour_version_seen: 0 }).eq("id", existing.id);
  console.log(error ? `reset failed: ${error.message}` : "Onboarding marked not finished.");
  process.exit(error ? 1 : 0);
}

if (existing) {
  console.error(`${EMAIL} already exists; run with --delete first.`);
  process.exit(1);
}
const password = generatePassword();
const { data, error } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Onboarding Test", role: "teacher", center_id: AKIS_CENTER_ID },
});
if (error) {
  console.error("create failed:", error.message);
  process.exit(1);
}
const id = data.user.id;
const { error: pErr } = await supabase
  .from("profiles")
  .update({
    must_change_password: false,
    passkey_prompt_dismissed_at: new Date().toISOString(),
    has_seen_tour: false,
    tour_version_seen: 0,
  })
  .eq("id", id);
if (pErr) console.error("profile update failed:", pErr.message);
const { data: access } = await supabase.from("profile_center_access").select("center_id").eq("profile_id", id);
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify({ email: EMAIL, password, id }, null, 2));
console.log(`Created ${EMAIL} (teacher). AKIS access rows: ${access?.length ?? 0}. Password written to scripts/output/onboarding-test-account.json`);
