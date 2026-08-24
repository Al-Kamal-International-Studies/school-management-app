#!/usr/bin/env node
// Rotates an existing account's password to a fresh random one, via the
// service-role Admin API (the same mechanism the in-app "admin sets a
// user's password directly" feature uses — admin.auth.admin.updateUserById,
// see src/app/(dashboard)/admin/users/actions.ts's adminSetUserPasswordAction)
// — never a raw SQL password hash, never a live login. Sets
// must_change_password = true so the account holder picks their own
// password the next time they sign in, exactly like every other
// admin-set/newly-created account in this app (src/lib/auth.ts's
// /force-password-change gate).
//
// Written for the launch-checklist item "rotate every credential that has
// ever been written in shared documentation" (HANDOVER.md, redacted 2026-08-24)
// — the two real admin accounts' passwords had been sitting in plaintext in
// HANDOVER.md (a local file, never committed to git — confirmed via a full
// history/working-tree grep before this script was written — but redacted
// and rotated anyway, since "never went public" isn't the same as "was
// never written down").
//
// Usage:
//   node scripts/rotate-password.mjs --email=admin@alkamalinternational.com
//   node scripts/rotate-password.mjs --email=admin@alkamalinternational.com --length=24
//
// Prints the new password to the console ONLY — never writes it to a file,
// never logs it anywhere persistent. Relay it to the account holder
// directly (chat, in person, a password manager share) and nowhere else,
// same convention this project has followed for every other generated
// credential (see HANDOVER.md's repeated "delivered directly, not
// reproduced in this document").
//
// Same env-loading / service-role shape as create-admin.mjs / bulk-onboard.mjs.

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

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

loadEnvLocal();
const { email, length } = parseArgs();

if (!email) {
  console.error("Usage: node scripts/rotate-password.mjs --email=someone@example.com [--length=20]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Same excludes-visually-ambiguous-characters approach as
// bulk-onboard.mjs/bulk-onboard-aket.mjs's generatePassword().
const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
function generatePassword(len = 20) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

const { data: profile, error: profileLookupError } = await supabase
  .from("profiles")
  .select("id, role, full_name")
  .eq("email", email)
  .maybeSingle();

if (profileLookupError) {
  console.error("Failed to look up profile:", profileLookupError.message);
  process.exit(1);
}
if (!profile) {
  console.error(`No profile found with email ${email}.`);
  process.exit(1);
}

// Admins get the stricter 15-char minimum (src/lib/security/password.ts),
// everyone else 20 chars by default same as the bulk-onboard scripts.
const passwordLength = length ? Number(length) : profile.role === "admin" ? 20 : 20;
if (profile.role === "admin" && passwordLength < 15) {
  console.error("Admin accounts require at least 15 characters.");
  process.exit(1);
}

const newPassword = generatePassword(passwordLength);

const { data: authUser, error: findAuthError } = await supabase.auth.admin.getUserById(profile.id);
if (findAuthError || !authUser?.user) {
  console.error("Failed to find the matching auth user:", findAuthError?.message ?? "not found");
  process.exit(1);
}

const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, { password: newPassword });
if (updateError) {
  console.error("Failed to rotate password:", updateError.message);
  process.exit(1);
}

const { error: mustChangeError } = await supabase
  .from("profiles")
  .update({ must_change_password: true })
  .eq("id", profile.id);
if (mustChangeError) {
  console.error("Password was rotated, but failed to set must_change_password:", mustChangeError.message);
  console.error(`Set it manually before considering this done: profiles.id = ${profile.id}`);
}

// Best-effort audit trail, matching logAuditEvent()'s shape
// (src/lib/audit/log.ts) — this script runs outside the app's request
// context so it can't call that helper directly, but writes the same
// shape of row via the service-role client it already holds.
await supabase.from("audit_logs").insert({
  actor_id: profile.id,
  action: "rotate_password_via_script",
  target_table: "profiles",
  target_id: profile.id,
  details: { reason: "credential rotation — see HANDOVER.md", triggered_via: "scripts/rotate-password.mjs" },
});

console.log(`Password rotated for ${email} (${profile.role}, ${profile.full_name ?? "no name on file"}).`);
console.log(`New temporary password: ${newPassword}`);
console.log("must_change_password is now true — they'll be asked to set their own password on next login.");
console.log("This password is shown here only — it is not written to any file or log. Relay it directly.");
