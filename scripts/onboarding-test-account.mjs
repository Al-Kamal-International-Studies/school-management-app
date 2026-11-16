#!/usr/bin/env node
// Throwaway accounts for signed-in runs of the getting-started onboarding
// (HANDOVER Part 62). Same "create, test, fully delete" precedent as
// create-tutorial-fixtures.mjs.
//
//   node scripts/onboarding-test-account.mjs <role>            create it
//   node scripts/onboarding-test-account.mjs <role> --reset    onboarding not finished again
//   node scripts/onboarding-test-account.mjs <role> --status   show its onboarding columns
//   node scripts/onboarding-test-account.mjs <role> --delete   delete it (and its output file)
//
// <role> is teacher, student or parent (no admin: admin accounts can read
// every real record and need 2FA, so a signed-in admin run uses a real admin).
//
// Safety: every account it creates carries app_metadata.fixture =
// "onboarding-test" (app_metadata can only be set with the service role, not
// by the user). --reset and --delete refuse any account whose email AND
// marker don't both match, so this script can never touch a real account.
// The generated password goes to scripts/output/onboarding-test-<role>.json
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

const ROLES = ["teacher", "student", "parent"];
const role = process.argv[2];
const mode = process.argv[3] ?? "--create";
if (!ROLES.includes(role) || !["--create", "--reset", "--status", "--delete"].includes(mode)) {
  console.error("Usage: node scripts/onboarding-test-account.mjs <teacher|student|parent> [--reset|--status|--delete]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing Supabase env vars in .env.local.");
  process.exit(1);
}
const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const AKIS_CENTER_ID = "00000000-0000-0000-0000-000000000001";
const FIXTURE = "onboarding-test";
const EMAIL = `onboarding.test.${role}@alkamalinternational.com`;
const outDir = path.join(rootDir, "scripts", "output");
const outFile = path.join(outDir, `onboarding-test-${role}.json`);

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function generatePassword(length = 20) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

function done(code, message) {
  if (message) (code ? console.error : console.log)(message);
  process.exit(code);
}

const { data: existing } = await supabase
  .from("profiles")
  .select("id, email, role, has_seen_tour, tour_version_seen")
  .eq("email", EMAIL)
  .maybeSingle();

/** The account only counts as ours if the email, role and service-role marker all match. */
async function ownedFixture() {
  if (!existing) return null;
  const { data, error } = await supabase.auth.admin.getUserById(existing.id);
  if (error || !data?.user) return null;
  const u = data.user;
  const ok = u.email === EMAIL && existing.email === EMAIL && existing.role === role && u.app_metadata?.fixture === FIXTURE;
  return ok ? existing : null;
}

if (mode === "--status") {
  if (!existing) done(0, "not found");
  const mine = await ownedFixture();
  done(0, JSON.stringify({ ...existing, fixture: !!mine }));
}

if (mode === "--delete" || mode === "--reset") {
  if (!existing) {
    if (mode === "--delete" && existsSync(outFile)) rmSync(outFile);
    done(mode === "--delete" ? 0 : 1, `${EMAIL}: not found.`);
  }
  const mine = await ownedFixture();
  if (!mine) done(1, `Refusing: ${EMAIL} exists but is not an onboarding test fixture (marker, email or role mismatch).`);
  if (mode === "--reset") {
    const { error } = await supabase.from("profiles").update({ has_seen_tour: false, tour_version_seen: 0 }).eq("id", mine.id);
    done(error ? 1 : 0, error ? `reset failed: ${error.message}` : "Onboarding marked not finished.");
  }
  const { error } = await supabase.auth.admin.deleteUser(mine.id);
  if (error) done(1, `delete failed: ${error.message}`);
  const { data: left } = await supabase.from("profiles").select("id").eq("email", EMAIL);
  if (existsSync(outFile)) rmSync(outFile);
  done(0, `Deleted ${EMAIL}. Profiles left with that email: ${left?.length ?? "?"}`);
}

if (existing) done(1, `${EMAIL} already exists; run with --delete first.`);
const password = generatePassword();
const { data, error } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password,
  email_confirm: true,
  app_metadata: { fixture: FIXTURE },
  user_metadata: { full_name: `Onboarding Test ${role[0].toUpperCase()}${role.slice(1)}`, role, center_id: AKIS_CENTER_ID },
});
if (error) done(1, `create failed: ${error.message}`);
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
done(0, `Created ${EMAIL} (${role}). AKIS access rows: ${access?.length ?? 0}. Password written to scripts/output/onboarding-test-${role}.json`);
