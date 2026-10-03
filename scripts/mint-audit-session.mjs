#!/usr/bin/env node
// Mints a fresh, browser-ready session for one audit account — signed in
// server-to-server (password, plus a TOTP step-up for admin/principal), with a
// registered device row — and writes the cookies to a JSON file. Nobody types
// a password or MFA code into a browser.
//
//   node scripts/mint-audit-session.mjs <key> [--tag=agent1] [--clear-devices] [--out=path.json]
//
// <key> is one of: admin principal teacher teacher2 student student2 student3
// parent parent2 firstlogin. Use a distinct --tag per concurrent tester: two
// browsers must never share one refresh token (Supabase revokes a session
// family on refresh-token reuse), so each tester should mint its own session.
// Each (account, tag) pair maps to exactly one device row, reused on re-mint,
// so repeated minting never walks an account into the 3-device cap.

import { readAccounts, mintSession, writeJson, outDir } from "./audit-common.mjs";
import path from "node:path";

const args = process.argv.slice(2);
const key = args.find((a) => !a.startsWith("--"));
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
if (!key) {
  console.error("Usage: node scripts/mint-audit-session.mjs <key> [--tag=x] [--clear-devices] [--out=file.json]");
  process.exit(1);
}

const { accounts } = readAccounts();
const account = accounts[key];
if (!account) {
  console.error(`Unknown account key "${key}". Known: ${Object.keys(accounts).join(", ")}`);
  process.exit(1);
}

const tag = opt("tag") ?? "default";
const session = await mintSession(account, { tag, clearDevices: args.includes("--clear-devices") });
const out = opt("out") ?? path.join(outDir, `session-${key}-${tag}.json`);
writeJson(out, session);
console.log(`Session for ${account.email} (tag ${tag}) written to ${out}`);
