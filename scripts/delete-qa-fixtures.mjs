#!/usr/bin/env node
// Deletes every disposable QA account created by create-qa-fixtures.mjs /
// create-qa-fixtures-2.mjs for this session's live production QA pass,
// mirroring HANDOVER.md Part 7's "disposable test account created and
// fully deleted for that purpose" precedent — nothing from this pass is
// meant to persist.
//
// Deletes auth users (profiles/students/autism_assignments/
// autism_videos/autism_video_comments/parent_students all cascade via FK
// on delete cascade), plus the one uploaded video file in the
// "autism-videos" Storage bucket (DB cascade doesn't touch Storage
// objects) and this session's one audit_logs row this script itself
// writes referencing an about-to-be-deleted profile (actor_id is on
// delete set null, so those rows survive harmlessly with a null actor —
// left as-is, consistent with how real account deletions already work
// elsewhere in this app).

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
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

const EMAILS = [
  "qa.admin@alkamalinternational.com",
  "qa.teacher@alkamaleducation.com",
  "qa.parent@alkamaleducation.com",
  "qa.student@alkamaleducation.com",
];

// Clean up the uploaded video file in Storage first (DB cascade won't
// touch Storage objects).
const { data: studentProfile } = await supabase.from("profiles").select("id").eq("email", "qa.student@alkamaleducation.com").maybeSingle();
if (studentProfile) {
  const { data: videos } = await supabase.from("autism_videos").select("id, file_path").eq("student_id", studentProfile.id);
  if (videos?.length) {
    const paths = videos.map((v) => v.file_path);
    const { error } = await supabase.storage.from("autism-videos").remove(paths);
    if (error) console.error("Failed to remove video file(s) from storage:", error.message);
    else console.log(`Removed ${paths.length} video file(s) from storage.`);
  }
}

for (const email of EMAILS) {
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) {
    console.log(`${email}: not found, already deleted?`);
    continue;
  }
  const { error } = await supabase.auth.admin.deleteUser(profile.id);
  if (error) {
    console.error(`Failed to delete ${email}:`, error.message);
  } else {
    console.log(`Deleted ${email} (${profile.id}) — cascades cleaned up profiles/students/autism_assignments/autism_videos/autism_video_comments/parent_students rows.`);
  }
}

console.log("\nDone.");
