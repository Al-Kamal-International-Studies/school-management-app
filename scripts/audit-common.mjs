// Shared helpers for the audit fixture scripts (create-audit-fixtures.mjs,
// mint-audit-session.mjs, delete-audit-fixtures.mjs). Same disposable-fixture
// precedent as create-qa-fixtures.mjs / create-tutorial-fixtures.mjs
// (HANDOVER.md Parts 7/13/26/32): everything created for an audit pass is
// meant to be fully deleted afterward.
//
// Not an entry point — import only.

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHmac, createHash } from "node:crypto";
import path from "node:path";

export const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const outDir = path.join(rootDir, "scripts", "output"); // gitignored
export const ACCOUNTS_FILE = path.join(outDir, "audit-accounts.json");
export const BASELINE_FILE = path.join(outDir, "audit-baseline.json");

export const AKIS_CENTER_ID = "00000000-0000-0000-0000-000000000001";
export const AKET_CENTER_ID = "00000000-0000-0000-0000-000000000002";

export function loadEnvLocal() {
  const envPath = path.join(rootDir, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
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

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing Supabase env vars in .env.local.");
  process.exit(1);
}

export const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

export function fail(label, error) {
  console.error(`${label}:`, error?.message ?? error);
  process.exit(1);
}

export function ensureOutDir() {
  mkdirSync(outDir, { recursive: true });
}

export function readAccounts() {
  if (!existsSync(ACCOUNTS_FILE)) fail("audit-accounts.json missing", new Error("run create-audit-fixtures.mjs first"));
  return JSON.parse(readFileSync(ACCOUNTS_FILE, "utf-8"));
}

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
export function generatePassword(length = 24) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

// --- TOTP (RFC 6238, SHA-1, 6 digits, 30s) — enough to satisfy Supabase MFA
// for the disposable admin/principal accounts without typing anything into a
// browser. ---------------------------------------------------------------
function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of input.replace(/=+$/, "").toUpperCase()) {
    const val = alphabet.indexOf(ch);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
export function totpCode(secret, atMs = Date.now()) {
  const counter = Math.floor(atMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

/** Deterministic UUID-shaped id from a string — so the same (account, tag)
 * always maps to the same device row instead of piling up new ones. */
export function deterministicUuid(seed) {
  const h = createHash("sha1").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** An @supabase/ssr server client backed by an in-memory cookie jar, so a
 * server-to-server sign-in yields the exact cookies a browser would hold. */
export function makeSsrClient() {
  const jar = new Map();
  const client = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (list) =>
        list.forEach((c) => {
          if (!c.value || c.options?.maxAge === 0) jar.delete(c.name);
          else jar.set(c.name, c);
        }),
    },
  });
  return { client, jar };
}

/**
 * Signs `account` in server-to-server (password, then TOTP step-up for
 * accounts with an enrolled factor) and registers a device row, returning
 * browser-ready cookies. No password is ever typed into a browser.
 *
 *   tag      — which device slot to use (one row per account+tag, reused).
 *   clearDevices — delete every existing device row for the account first.
 */
export async function mintSession(account, { tag = "default", clearDevices = false } = {}) {
  const { client, jar } = makeSsrClient();
  const { error } = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  if (error) throw new Error(`sign in ${account.email}: ${error.message}`);

  if (account.totpSecret) {
    const { data: factors, error: lfErr } = await client.auth.mfa.listFactors();
    if (lfErr) throw new Error(`listFactors ${account.email}: ${lfErr.message}`);
    const factor = factors.totp.find((f) => f.status === "verified");
    if (!factor) throw new Error(`no verified TOTP factor for ${account.email}`);
    const { data: ch, error: chErr } = await client.auth.mfa.challenge({ factorId: factor.id });
    if (chErr) throw new Error(`mfa challenge ${account.email}: ${chErr.message}`);
    const { error: vErr } = await client.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: totpCode(account.totpSecret) });
    if (vErr) throw new Error(`mfa verify ${account.email}: ${vErr.message}`);
  }

  if (clearDevices) await admin.from("user_devices").delete().eq("user_id", account.id);
  const deviceId = deterministicUuid(`${account.id}:${tag}`);
  const { error: devErr } = await admin
    .from("user_devices")
    .upsert({ user_id: account.id, device_id: deviceId, label: `audit-mint:${tag}`, last_seen_at: new Date().toISOString() }, { onConflict: "user_id,device_id" });
  if (devErr) throw new Error(`device upsert ${account.email}: ${devErr.message}`);

  return {
    email: account.email,
    role: account.role,
    cookies: [
      ...[...jar.values()].map(({ name, value }) => ({ name, value })),
      { name: "device_id", value: deviceId },
      { name: "NEXT_LOCALE", value: "en" },
    ],
  };
}

// --- Baseline snapshot -------------------------------------------------------
export const TABLES = [
  "profiles", "classes", "subjects", "teachers", "students", "class_subject_teachers", "enrollments",
  "timetable_entries", "chatbot_conversations", "chatbot_messages", "monthly_progress_entries",
  "announcements", "feedback", "attendance_records", "assignments", "assignment_submissions", "exams",
  "grades", "teacher_remarks", "behaviour_log", "leave_requests", "events", "documents", "audit_logs",
  "dm_conversations", "dm_messages", "push_subscriptions", "parent_students", "rate_limit_events",
  "password_reset_requests", "user_devices", "webauthn_credentials", "centers", "profile_center_access",
  "subject_chat_messages", "notifications", "autism_assignments", "autism_videos", "autism_video_comments",
  "admissions", "outbound_emails", "native_push_tokens", "chats", "chat_messages", "message_flags",
];
export const BUCKETS = ["avatars", "documents", "autism-videos", "admissions-pdfs"];

export async function listTableRows(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select("*").order("id").range(from, from + 999);
    if (error) return { error: error.message };
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return { rows };
}

/** column -> short content hash, so a later diff can say WHICH columns of a
 * pre-existing row changed without the snapshot file holding real values. */
export function rowHashes(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = createHash("sha1").update(JSON.stringify(v ?? null)).digest("hex").slice(0, 10);
  }
  return out;
}

export async function listBucket(bucket, prefix = "") {
  const out = [];
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) return out;
  for (const item of data) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) out.push(...(await listBucket(bucket, full)));
    else out.push(full);
  }
  return out;
}

export async function takeSnapshot() {
  // tables[table] = { <row id>: { <column>: <short hash> } } — no real values.
  const snap = { takenAt: new Date().toISOString(), tables: {}, buckets: {}, skipped: {} };
  for (const t of TABLES) {
    const res = await listTableRows(t);
    if (res.error) snap.skipped[t] = res.error;
    else snap.tables[t] = Object.fromEntries(res.rows.map((r) => [r.id, rowHashes(r)]));
  }
  for (const b of BUCKETS) snap.buckets[b] = await listBucket(b);
  return snap;
}

export function writeJson(file, data) {
  ensureOutDir();
  writeFileSync(file, JSON.stringify(data, null, 2));
}
