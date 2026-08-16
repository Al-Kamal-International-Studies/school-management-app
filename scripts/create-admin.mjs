#!/usr/bin/env node
// Bootstraps the very first Admin account. Run once after migrations are
// applied — after that, admins create every other account from the app UI.
//
// Usage:
//   npm run create-admin -- --email=you@school.org --password=ChangeMe123! --name="Jane Principal"
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.

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
const { email, password, name } = parseArgs();

if (!email || !password || !name) {
  console.error(
    'Usage: npm run create-admin -- --email=you@school.org --password=ChangeMe123! --name="Jane Principal"'
  );
  process.exit(1);
}

// Admin accounts get the stricter 15-char minimum (see
// src/lib/security/password.ts / docs/SECURITY.md F5). This script is a
// plain Node ESM script (no TS transpilation), so the check is inlined
// rather than imported — keep it in sync with MIN_PASSWORD_LENGTH_ADMIN if
// that constant ever changes.
if (password.length < 15) {
  console.error("Password must be at least 15 characters for an admin account.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: name, role: "admin" },
});

if (error) {
  console.error("Failed to create admin:", error.message);
  process.exit(1);
}

// Every account this app creates gets must_change_password = true on first
// login, no exceptions — see requireRole()'s /force-password-change gate
// (src/lib/auth.ts) and HANDOVER.md's account-security section. This is
// the very first account in a fresh environment, so there's no
// on_auth_user_created-created row race to worry about; it already exists
// by the time createUser() above resolves.
const { error: profileError } = await supabase
  .from("profiles")
  .update({ must_change_password: true })
  .eq("id", data.user.id);

if (profileError) {
  console.error("Admin account created, but failed to set must_change_password:", profileError.message);
  console.error(`Set it manually before handing off credentials: profiles.id = ${data.user.id}`);
  process.exit(1);
}

console.log(`Admin account created: ${data.user.email} (id: ${data.user.id})`);
console.log("You can now sign in at /login with this email and password — you'll be asked to set a new one immediately.");
