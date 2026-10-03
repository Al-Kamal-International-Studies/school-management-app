#!/usr/bin/env node
// Removes everything the full-app audit (HANDOVER.md Part 33) created, and
// proves pre-existing data was left alone.
//
//   node scripts/delete-audit-fixtures.mjs              # DRY RUN: lists what it would delete
//   node scripts/delete-audit-fixtures.mjs --execute    # actually delete
//   node scripts/delete-audit-fixtures.mjs --verify     # only report changes to PRE-EXISTING rows
//
// How it decides what is "ours": it diffs the current database against the
// baseline snapshot create-audit-fixtures.mjs took before creating anything.
// A row that is NEW since the baseline is deleted only if it belongs to the
// audit — i.e. (transitively) it references an audit account / audit class /
// another audit row by id, or carries the "[AUDIT" marker in a text column.
// New rows that do NOT match are left alone and listed for human review
// (they are most likely real activity by real users during the audit window).
// Pre-existing rows are never deleted; --verify / the final report list any
// whose content changed since the baseline.
//
// audit_logs rows are KEPT by default (an audit trail shouldn't be silently
// purged; same convention as the earlier QA/tutorial fixtures — they survive
// with a null actor). Pass --purge-audit-log to remove them too.
//
// Accounts created DURING the audit by an audit tester (via the admin UI or
// the admissions flow) must use an "audit." email prefix; only new profiles
// matching that prefix are deleted automatically.

import { readFileSync, existsSync } from "node:fs";
import { admin, ACCOUNTS_FILE, BASELINE_FILE, BUCKETS, TABLES, listBucket, listTableRows, rowHashes, fail } from "./audit-common.mjs";

const execute = process.argv.includes("--execute");
const verifyOnly = process.argv.includes("--verify");
const purgeAuditLog = process.argv.includes("--purge-audit-log");

if (!existsSync(BASELINE_FILE)) fail("baseline missing", new Error("scripts/output/audit-baseline.json not found — cannot tell what the audit created"));
const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf-8"));
const accountsFile = existsSync(ACCOUNTS_FILE) ? JSON.parse(readFileSync(ACCOUNTS_FILE, "utf-8")) : null;

const NOISY_COLUMNS = new Set(["updated_at", "last_seen_at"]);
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

// --- Current state ----------------------------------------------------------
const current = {};
for (const t of TABLES) {
  if (baseline.skipped[t]) continue;
  const res = await listTableRows(t);
  if (res.error) { console.warn(`skip ${t}: ${res.error}`); continue; }
  current[t] = res.rows;
}

// --- Integrity check: pre-existing rows that vanished or changed -------------
let integrityIssues = 0;
console.log("=== Integrity check on PRE-EXISTING rows ===");
for (const [t, baseRows] of Object.entries(baseline.tables)) {
  if (!current[t]) continue;
  const byId = new Map(current[t].map((r) => [r.id, r]));
  const removed = [];
  const changed = [];
  for (const [id, hashes] of Object.entries(baseRows)) {
    const row = byId.get(id);
    if (!row) { removed.push(id); continue; }
    const now = rowHashes(row);
    const cols = Object.keys({ ...hashes, ...now }).filter((c) => hashes[c] !== now[c] && !NOISY_COLUMNS.has(c));
    if (cols.length) changed.push(`${id} [${cols.join(",")}]`);
  }
  if (removed.length || changed.length) {
    integrityIssues += removed.length + changed.length;
    console.log(`  ${t}: ${removed.length} removed, ${changed.length} changed`);
    removed.slice(0, 10).forEach((id) => console.log(`     removed ${id}`));
    changed.slice(0, 10).forEach((c) => console.log(`     changed ${c}`));
  }
}
if (!integrityIssues) console.log("  none — every pre-existing row is unchanged (ignoring updated_at/last_seen_at).");
if (verifyOnly) process.exit(0);

// --- Which new rows belong to the audit? --------------------------------------
const demoIds = new Set();
if (accountsFile) {
  Object.values(accountsFile.accounts).forEach((a) => demoIds.add(a.id));
  demoIds.add(accountsFile.classA);
  demoIds.add(accountsFile.classB);
}
const newRows = {};
for (const [t, rows] of Object.entries(current)) {
  newRows[t] = rows.filter((r) => !(r.id in (baseline.tables[t] ?? {})));
}
// Accounts created during the audit by a tester (audit.* email prefix).
for (const p of newRows.profiles ?? []) if (/^audit[.\-_]/i.test(p.email ?? "")) demoIds.add(p.id);

const matched = new Map(); // table -> Set(id)
const refersToDemo = (row) => {
  const json = JSON.stringify(row);
  if (json.includes("[AUDIT")) return true;
  if (/audit[.\-][\w.\-]*@/i.test(json)) return true; // e.g. a rate-limit bucket "login:audit.x@…"
  return (json.match(UUID_RE) ?? []).some((u) => demoIds.has(u));
};
for (let changed = true; changed; ) {
  changed = false;
  for (const [t, rows] of Object.entries(newRows)) {
    if (t === "audit_logs" && !purgeAuditLog) continue;
    for (const r of rows) {
      if (matched.get(t)?.has(r.id)) continue;
      if (demoIds.has(r.id) || refersToDemo(r)) {
        if (!matched.has(t)) matched.set(t, new Set());
        matched.get(t).add(r.id);
        demoIds.add(r.id);
        changed = true;
      }
    }
  }
}

console.log("\n=== New rows since baseline ===");
for (const [t, rows] of Object.entries(newRows)) {
  if (!rows.length) continue;
  const ours = matched.get(t)?.size ?? 0;
  const kept = t === "audit_logs" && !purgeAuditLog ? ` (kept: audit trail)` : "";
  console.log(`  ${t}: ${rows.length} new, ${ours} belong to the audit${kept}, ${rows.length - ours} not matched`);
}

// --- Storage -------------------------------------------------------------------
// Paths stored in matched rows (e.g. admissions.pdf_file_path, autism_videos.file_path): their
// storage objects were created by the audit even though the file name is a random UUID.
const referencedPaths = new Set();
for (const [t, ids] of matched) {
  for (const row of newRows[t] ?? []) {
    if (!ids.has(row.id)) continue;
    for (const [col, val] of Object.entries(row)) if (/(^|_)(file_)?path$/.test(col) && typeof val === "string" && val) referencedPaths.add(val);
  }
}
const storageToDelete = [];
const storageUnmatched = [];
for (const b of BUCKETS) {
  const before = new Set(baseline.buckets[b] ?? []);
  for (const p of await listBucket(b)) {
    if (before.has(p)) continue;
    const ids = p.match(UUID_RE) ?? [];
    if (referencedPaths.has(p) || ids.some((u) => demoIds.has(u))) storageToDelete.push([b, p]);
    else storageUnmatched.push([b, p]);
  }
}
console.log(`\n=== Storage: ${storageToDelete.length} new audit objects, ${storageUnmatched.length} new unmatched ===`);
storageUnmatched.forEach(([b, p]) => console.log(`  unmatched ${b}/${p}`));

if (!execute) {
  console.log("\nDRY RUN — nothing deleted. Re-run with --execute to delete the matched rows/objects/accounts.");
  console.log("Unmatched new rows (listed above by count) are never deleted automatically.");
  process.exit(0);
}

// --- Delete -----------------------------------------------------------------------
console.log("\n=== Deleting ===");
for (const [b, p] of storageToDelete) {
  const { error } = await admin.storage.from(b).remove([p]);
  console.log(error ? `  FAILED storage ${b}/${p}: ${error.message}` : `  removed storage ${b}/${p}`);
}

// Rows: repeat passes so children go before parents regardless of FK order.
const pending = [];
for (const [t, ids] of matched) {
  if (t === "profiles") continue; // handled via auth.admin.deleteUser (cascades)
  for (const id of ids) pending.push([t, id]);
}
for (let pass = 0; pass < 6 && pending.length; pass++) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const [t, id] = pending[i];
    const { error } = await admin.from(t).delete().eq("id", id);
    if (!error) pending.splice(i, 1);
  }
}
if (pending.length) console.log(`  could not delete ${pending.length} rows directly (will rely on cascade):`, pending.slice(0, 10));

const profileIds = [...(matched.get("profiles") ?? [])];
if (accountsFile) for (const a of Object.values(accountsFile.accounts)) if (!profileIds.includes(a.id)) profileIds.push(a.id);
for (const id of profileIds) {
  const { error } = await admin.auth.admin.deleteUser(id);
  console.log(error ? `  FAILED user ${id}: ${error.message}` : `  deleted user ${id}`);
}
if (accountsFile) {
  for (const id of [accountsFile.classA, accountsFile.classB]) {
    const { error } = await admin.from("classes").delete().eq("id", id);
    if (error && !/0 rows/.test(error.message)) console.log(`  class ${id}: ${error.message}`);
  }
}

// --- Verify -------------------------------------------------------------------------
console.log("\n=== Post-delete verification ===");
let leftovers = 0;
for (const [t, ids] of matched) {
  const { data } = await admin.from(t).select("id").in("id", [...ids]);
  if (data?.length) { leftovers += data.length; console.log(`  LEFTOVER ${t}: ${data.length}`); }
}
console.log(leftovers ? `${leftovers} leftover rows — investigate.` : "No matched rows remain.");
console.log("\nDone. Re-run with --verify to re-check pre-existing rows.");
