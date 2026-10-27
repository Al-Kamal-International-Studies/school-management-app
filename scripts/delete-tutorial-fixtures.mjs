#!/usr/bin/env node
// Deletes everything create-tutorial-fixtures.mjs created, plus everything
// recorded through those accounts while filming the teacher introduction
// video. Deleting the demo class cascades its class_subject_teachers,
// timetable_entries, attendance, assignments, exams, grades and progress
// entries; deleting the auth users cascades profiles/teachers/students/
// enrollments/user_devices/remarks/behaviour_log (all on delete cascade).
// audit_logs rows survive with a null actor_id (on delete set null), the
// same as every real account deletion in this app.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(rootDir, ".env.local");
function loadEnvLocal() {
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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AKIS_CENTER_ID = "00000000-0000-0000-0000-000000000001";
const EMAILS = [
  "tutorial.teacher@alkamalinternational.com",
  ...[1, 2, 3, 4, 5].map((n) => `tutorial.student${n}@alkamalinternational.com`),
];

const { data: classes } = await supabase
  .from("classes")
  .select("id")
  .eq("center_id", AKIS_CENTER_ID)
  .eq("name", "Demo Class | Grade 5");
for (const { id } of classes ?? []) {
  const { error } = await supabase.from("classes").delete().eq("id", id);
  console.log(error ? `Failed to delete class ${id}: ${error.message}` : `Deleted demo class ${id}.`);
}

for (const email of EMAILS) {
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) {
    console.log(`${email}: not found, already deleted?`);
    continue;
  }
  const { error } = await supabase.auth.admin.deleteUser(profile.id);
  console.log(error ? `Failed to delete ${email}: ${error.message}` : `Deleted ${email}.`);
}

const sessionFile = path.join(rootDir, "scripts", "output", "tutorial-session.json");
if (existsSync(sessionFile)) rmSync(sessionFile);

console.log("\nDone.");
