// 0048_demo_center.sql (HANDOVER Part 45): demo teacher / student / parent
// accounts in the DEMO center must not be able to read or change a single
// AKIS row — checked table by table, the way PostgREST would serve them —
// while AKIS users keep exactly the access they had.
import { makeDb, asUser } from "./load.mjs";
const AKIS = "00000000-0000-0000-0000-000000000001";
const AKET = "00000000-0000-0000-0000-000000000002";
const DEMO = "00000000-0000-0000-0000-000000000003";

let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "  <<< " + x}`); };

async function setup(upTo) {
  const { db, log } = await makeDb({ upTo });
  const failed = log.filter((l) => l.startsWith("FAIL"));
  if (failed.length) { console.log(failed.join("\n")); process.exit(1); }
  // 0047 and earlier don't know the DEMO center; 0048 inserts it itself
  await db.query(`insert into centers (id, name, short_code) values ($1, 'demo', 'DEMO') on conflict (id) do nothing`, [DEMO]);
  const q = async (sql, p = []) => (await db.query(sql, p)).rows;
  const one = async (sql, p = []) => (await q(sql, p))[0]?.id;
  const asService = async (sql, p = []) => {
    await db.exec("reset role; set role service_role;");
    try { return { rows: (await db.query(sql, p)).rows }; } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
  };
  let n = 0;
  const mk = (email, role, center) =>
    one(`insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`, [email, JSON.stringify({ full_name: email, role, center_id: center })]);

  // A small but complete school: one row in every table a teacher, student or
  // parent could plausibly reach.
  async function world(tag, center, withAdmin) {
    const u = {
      teacher: await mk(`${tag}.teacher@x`, "teacher", center),
      student: await mk(`${tag}.student@x`, "student", center),
      parent: await mk(`${tag}.parent@x`, "parent", center),
    };
    if (withAdmin) u.admin = await mk(`${tag}.admin@x`, "admin", center);
    await q(`insert into teachers (id, employee_id) values ($1, $2)`, [u.teacher, `${tag}-T1`]);
    const cls = await one(`insert into classes (name, section, academic_year, center_id, homeroom_teacher_id) values ($1, 'A', '2026', $2, $3) returning id`, [`${tag} G5`, center, u.teacher]);
    const sub = await one(`insert into subjects (name, code, center_id) values ($1, $2, $3) returning id`, [`${tag} Maths`, `${tag}-M`, center]);
    await q(`insert into students (id, enrollment_number, class_id, guardian_phone, address) values ($1, $2, $3, '+971500000000', 'secret street')`, [u.student, `${tag}-S1`, cls]);
    await q(`insert into parent_students (parent_id, student_id) values ($1, $2)`, [u.parent, u.student]);
    await q(`insert into enrollments (student_id, class_id, academic_year) values ($1, $2, '2026')`, [u.student, cls]);
    const cst = await one(`insert into class_subject_teachers (class_id, subject_id, teacher_id) values ($1, $2, $3) returning id`, [cls, sub, u.teacher]);
    await q(`insert into timetable_entries (class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room) values ($1, $2, $3, 1, '08:00', '08:45', $4)`, [cls, sub, u.teacher, `${tag} room`]);
    const exam = await one(`insert into exams (class_id, subject_id, teacher_id, title, exam_date) values ($1, $2, $3, $4, '2026-11-10') returning id`, [cls, sub, u.teacher, `${tag} midterm`]);
    await q(`insert into grades (student_id, subject_id, class_id, teacher_id, exam_id, assessment_name, marks_obtained, marks_total) values ($1, $2, $3, $4, $5, 'quiz', 7, 10)`, [u.student, sub, cls, u.teacher, exam]);
    await q(`insert into attendance_records (student_id, class_id, date, status, marked_by) values ($1, $2, '2026-10-30', 'present', $3)`, [u.student, cls, u.teacher]);
    const asg = await one(`insert into assignments (class_id, subject_id, teacher_id, title, due_date) values ($1, $2, $3, $4, '2026-11-05') returning id`, [cls, sub, u.teacher, `${tag} homework`]);
    await q(`insert into assignment_submissions (assignment_id, student_id, status) values ($1, $2, 'submitted')`, [asg, u.student]);
    await q(`insert into behaviour_log (student_id, teacher_id, category, description) values ($1, $2, 'positive', 'helped')`, [u.student, u.teacher]);
    await q(`insert into teacher_remarks (student_id, teacher_id, remark) values ($1, $2, 'good')`, [u.student, u.teacher]);
    await q(`insert into monthly_progress_entries (student_id, subject_id, class_id, teacher_id, month, attendance_percentage, homework_completion, class_participation, behaviour_conduct, assessment_performance, subject_understanding) values ($1, $2, $3, $4, '2026-10-01', 90, 90, 90, 90, 90, 90)`, [u.student, sub, cls, u.teacher]);
    await q(`insert into leave_requests (student_id, reason, start_date, end_date) values ($1, 'flu', '2026-11-01', '2026-11-02')`, [u.student]);
    for (const aud of ["all", "student", "parent", "teacher"]) {
      await q(`insert into announcements (title, body, audience, center_id, created_by) values ($1, 'body', $2, $3, $4)`, [`${tag} ${aud} news`, aud, center, u.teacher]);
      await q(`insert into events (title, event_date, audience, center_id, created_by) values ($1, '2026-11-20', $2, $3, $4)`, [`${tag} ${aud} event`, aud, center, u.teacher]);
      await q(`insert into documents (title, audience, file_path, center_id) values ($1, $2, 'x.pdf', $3)`, [`${tag} ${aud} doc`, aud, center]);
    }
    await q(`insert into documents (title, student_id, file_path, center_id) values ($1, $2, 'r.pdf', $3)`, [`${tag} report card`, u.student, center]);
    await q(`insert into feedback (user_id, category, subject, message, center_id) values ($1, 'general', 's', 'm', $2)`, [u.teacher, center]);
    await q(`insert into notifications (user_id, type, title, body) values ($1, 'x', 't', 'b')`, [u.student]);
    await q(`insert into user_devices (user_id, device_id) values ($1, gen_random_uuid())`, [u.teacher]);
    await q(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${u.student}/face.jpg`]);
    if (withAdmin) {
      await q(`insert into admissions (center_id, student_full_name, student_gender, consent_accepted, payment_policy_accepted, created_by, father_mobile) values ($1, 'kid', 'male', true, true, $2, '+971511111111')`, [center, u.admin]);
      await q(`insert into audit_logs (actor_id, action) values ($1, 'x')`, [u.admin]);
    }
    // chats: a teacher<->student DM and the subject group (trigger-created)
    const dm = (await asService(`select public.open_direct_chat($1, $2) id`, [u.teacher, u.student])).rows?.[0]?.id;
    const group = await one(`select id from chats where cst_id = $1`, [cst]);
    for (const chat of [dm, group].filter(Boolean)) {
      await asService(`select * from public.send_chat_message($1, $2, $3, $4)`, [u.teacher, chat, `${tag} private words`, `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`]);
    }
    return { u, cls, sub, dm, group, asg };
  }

  const akis = await world("akis", AKIS, true);
  // a principal holding AKIS + AKET, and an AKET-only account (can't sign in since Part 37)
  akis.u.principal = await mk("principal@x", "admin", AKIS);
  await q(`insert into profile_center_access (profile_id, center_id) values ($1, $2)`, [akis.u.principal, AKET]);
  akis.u.aketOnly = await mk("aket.teacher@x", "teacher", AKET);

  // Snapshot every AKIS-world row in every public table before the demo exists.
  const tables = (await q(`select tablename from pg_tables where schemaname = 'public' order by 1`)).map((r) => r.tablename);
  const keyOf = (row) => row.id ?? JSON.stringify(row);
  const snapshot = {};
  for (const t of tables) snapshot[t] = new Set((await q(`select * from ${t}`)).map(keyOf));
  snapshot.centers.delete(DEMO); // the demo's own center row is theirs to see
  snapshot["storage.objects"] = new Set((await q(`select * from storage.objects`)).map(keyOf));

  const demo = await world("demo", DEMO, false);
  return { db, q, asService, akis, demo, tables, snapshot, keyOf };
}

async function leaks(env, who) {
  const found = [];
  for (const t of [...env.tables, "storage.objects"]) {
    const r = await asUser(env.db, who, `select * from ${t}`);
    if (r.error) continue; // no grant at all = no leak
    const hits = r.rows.filter((row) => env.snapshot[t].has(env.keyOf(row)));
    if (hits.length) found.push(`${t}(${hits.length})`);
  }
  return found;
}

// ---------------------------------------------------------------- before 0048
console.log("--- before 0048: the leaks this migration closes ---");
{
  const env = await setup(47);
  const all = [];
  for (const role of ["teacher", "student", "parent"]) all.push(...(await leaks(env, env.demo.u[role])).map((l) => `${role}:${l}`));
  check("before 0048 a demo account can read AKIS rows (test is able to see leaks)", all.length > 0, "no leaks found");
  console.log("      leaked: " + all.join(", "));
  const del = await asUser(env.db, env.demo.u.teacher, `delete from timetable_entries where class_id = $1`, [env.akis.cls]);
  check("before 0048 a demo teacher can delete the AKIS timetable", del.count === 1, JSON.stringify(del));
}

// The three cross-center writes Jack found in 0048 (fixed by 0049)
const crossCenterWrites = async (env) => {
  const { db, akis, demo } = env;
  const out = {};
  // DEMO class + AKIS teacher, at a time the AKIS teacher is free
  let r = await asUser(db, demo.u.teacher, `insert into timetable_entries (class_id, subject_id, teacher_id, day_of_week, start_time, end_time) values ($1, $2, $3, 4, '10:00', '10:45')`, [demo.cls, demo.sub, akis.u.teacher]);
  out.timetableAkisTeacher = !r.error;
  r = await asUser(db, demo.u.teacher, `update timetable_entries set teacher_id = $1 where class_id = $2 and day_of_week = 1`, [akis.u.teacher, demo.cls]);
  out.timetableRetarget = !r.error && r.count > 0;
  r = await asUser(db, demo.u.parent, `insert into feedback (user_id, category, subject, message) values ($1, 'general', 'omitted center', 'm')`, [demo.u.parent]);
  out.feedbackDefaultAkis = !r.error;
  r = await asUser(db, demo.u.parent, `insert into feedback (user_id, category, subject, message, center_id) values ($1, 'general', 'explicit akis', 'm', $2)`, [demo.u.parent, AKIS]);
  out.feedbackExplicitAkis = !r.error;
  r = await asUser(db, demo.u.student, `update assignment_submissions set assignment_id = $1 where student_id = $2`, [akis.asg, demo.u.student]);
  out.submissionMoved = !r.error && r.count > 0;
  return out;
};

console.log("--- 0048 alone: Jack's three cross-center writes (fixed by 0049) ---");
{
  const env = await setup(48);
  const w = await crossCenterWrites(env);
  check("up to 0048 a demo teacher can book an AKIS teacher into a demo class", w.timetableAkisTeacher, JSON.stringify(w));
  check("up to 0048 a demo parent's feedback can land in AKIS", w.feedbackDefaultAkis && w.feedbackExplicitAkis, JSON.stringify(w));
  check("up to 0048 a demo student can move a submission onto an AKIS assignment", w.submissionMoved, JSON.stringify(w));
}

// ----------------------------------------------------------------- after 0048
console.log("--- after 0048: demo accounts see no AKIS row in any table ---");
const env = await setup(999);
const { db, q, akis, demo } = env;
for (const role of ["teacher", "student", "parent"]) {
  const l = await leaks(env, demo.u[role]);
  check(`demo ${role} reads zero AKIS rows across all ${env.tables.length} tables + avatars`, l.length === 0, l.join(", "));
}
const anonAvatars = await (async () => {
  await db.exec("reset role; set role anon;");
  try { return (await db.query(`select * from storage.objects where bucket_id = 'avatars'`)).rows.length; } finally { await db.exec("reset role"); }
})();
check("signed-out visitors can no longer list the avatars bucket", anonAvatars === 0, anonAvatars);
check("a user can still read their own avatar object (upload/upsert path)", (await asUser(db, akis.u.student, `select * from storage.objects where bucket_id = 'avatars'`)).rows?.length === 1);

console.log("--- demo accounts can't change AKIS data ---");
const before = (await q(`select count(*)::int c from timetable_entries where class_id = $1`, [akis.cls]))[0].c;
await asUser(db, demo.u.teacher, `delete from timetable_entries where class_id = $1`, [akis.cls]);
await asUser(db, demo.u.teacher, `update timetable_entries set room = 'hacked' where class_id = $1`, [akis.cls]);
const after = await q(`select count(*)::int c, max(room) room from timetable_entries where class_id = $1`, [akis.cls]);
check("demo teacher can't delete or edit the AKIS timetable", after[0].c === before && after[0].room !== "hacked", JSON.stringify(after));
let r = await asUser(db, demo.u.teacher, `insert into timetable_entries (class_id, subject_id, teacher_id, day_of_week, start_time, end_time) values ($1, $2, $3, 2, '09:00', '09:45')`, [akis.cls, akis.sub, demo.u.teacher]);
check("demo teacher can't add a period to an AKIS class", !!r.error, JSON.stringify(r));
r = await asUser(db, demo.u.teacher, `insert into dm_conversations (participant_a, participant_b) values ($1, $2)`, [demo.u.teacher, akis.u.admin]);
check("demo teacher can't open a legacy DM with an AKIS admin", !!r.error, JSON.stringify(r));
// open_direct_chat refuses by returning null
r = await env.asService(`select public.open_direct_chat($1, $2) id`, [demo.u.teacher, akis.u.admin]);
check("demo teacher can't open a chat with an AKIS admin", !r.error && r.rows[0].id === null, JSON.stringify(r));
r = await env.asService(`select public.open_direct_chat($1, $2) id`, [akis.u.admin, demo.u.student]);
check("an AKIS admin can't open a chat with a demo student either", !r.error && r.rows[0].id === null, JSON.stringify(r));

console.log("--- 0049: cross-center writes are refused ---");
{
  const w = await crossCenterWrites(env);
  check("demo teacher can't book an AKIS teacher into a demo class", !w.timetableAkisTeacher, JSON.stringify(w));
  check("demo teacher can't retarget a demo period to an AKIS teacher", !w.timetableRetarget, JSON.stringify(w));
  check("demo feedback with no center can't default into AKIS", !w.feedbackDefaultAkis, JSON.stringify(w));
  check("demo feedback can't name the AKIS center", !w.feedbackExplicitAkis, JSON.stringify(w));
  check("demo student can't move a submission onto an AKIS assignment", !w.submissionMoved, JSON.stringify(w));
  const akisSubs = await q(`select count(*)::int c from assignment_submissions where assignment_id = $1`, [akis.asg]);
  check("the AKIS assignment still has only its own submission", akisSubs[0].c === 1, JSON.stringify(akisSubs));
}

console.log("--- demo accounts still work inside the demo ---");
r = await asUser(db, demo.u.parent, `insert into feedback (user_id, category, subject, message, center_id) values ($1, 'general', 'demo', 'm', $2)`, [demo.u.parent, DEMO]);
check("demo parent can send feedback to the demo center", !r.error, JSON.stringify(r));
r = await asUser(db, demo.u.student, `update assignment_submissions set status = 'submitted', submitted_at = now() where student_id = $1 and assignment_id = $2`, [demo.u.student, demo.asg]);
check("demo student can still resubmit their own homework", !r.error && r.count === 1, JSON.stringify(r));
const contacts = async (who) => (await asUser(db, who, `select id from public.my_contacts()`)).rows.map((x) => x.id);
let c = await contacts(demo.u.teacher);
check("demo teacher's contacts = their demo student and parent only", c.length === 2 && c.includes(demo.u.student) && c.includes(demo.u.parent), JSON.stringify(c));
c = await contacts(demo.u.student);
check("demo student's contacts = their demo teacher only", c.length === 1 && c[0] === demo.u.teacher, JSON.stringify(c));
check("demo teacher sees the demo timetable", (await asUser(db, demo.u.teacher, `select * from timetable_entries`)).rows.length === 1);
r = await asUser(db, demo.u.teacher, `insert into timetable_entries (class_id, subject_id, teacher_id, day_of_week, start_time, end_time) values ($1, $2, $3, 2, '09:00', '09:45')`, [demo.cls, demo.sub, demo.u.teacher]);
check("demo teacher can add a period to the demo class", !r.error, JSON.stringify(r));
check("demo parent sees demo 'all' + 'student' + 'parent' announcements", (await asUser(db, demo.u.parent, `select * from announcements`)).rows.length === 3);
check("demo parent sees their child's demo grades", (await asUser(db, demo.u.parent, `select * from grades`)).rows.length === 1);
check("demo student reads the demo subject group", (await asUser(db, demo.u.student, `select * from chat_messages where chat_id = '${demo.group}'`)).rows.length === 1);

console.log("--- AKIS users keep their access ---");
c = await contacts(akis.u.teacher);
check("AKIS teacher's contacts still include their student, parent and the admins", [akis.u.student, akis.u.parent, akis.u.admin, akis.u.principal].every((id) => c.includes(id)) && !c.includes(demo.u.student), JSON.stringify(c));
c = await contacts(akis.u.principal);
check("principal (AKIS+AKET) doesn't get AKET-only or demo people as contacts", !c.includes(akis.u.aketOnly) && !c.includes(demo.u.teacher) && c.includes(akis.u.teacher), JSON.stringify(c));
for (const [t, n] of [["timetable_entries", 1], ["exams", 1], ["class_subject_teachers", 1], ["enrollments", 1], ["teachers", 1]]) {
  check(`AKIS student still reads ${t}`, (await asUser(db, akis.u.student, `select * from ${t}`)).rows.length === n);
}
check("AKIS parent still sees 'all' + 'student' + 'parent' announcements", (await asUser(db, akis.u.parent, `select * from announcements`)).rows.length === 3);
check("AKIS parent still sees 'all' + 'student' + 'parent' events", (await asUser(db, akis.u.parent, `select * from events`)).rows.length === 3);
r = await asUser(db, akis.u.teacher, `insert into timetable_entries (class_id, subject_id, teacher_id, day_of_week, start_time, end_time) values ($1, $2, $3, 3, '09:00', '09:45')`, [akis.cls, akis.sub, akis.u.teacher]);
check("AKIS teacher can still write the AKIS timetable", !r.error, JSON.stringify(r));
r = await asUser(db, akis.u.teacher, `update timetable_entries set room = 'B2' where class_id = $1 and day_of_week = 3`, [akis.cls]);
check("AKIS teacher can still edit the AKIS timetable", r.count === 1, JSON.stringify(r));
r = await env.asService(`select public.open_direct_chat($1, $2) id`, [akis.u.teacher, akis.u.admin]);
check("AKIS teacher can still open a chat with an AKIS admin", !r.error && !!r.rows?.[0]?.id, JSON.stringify(r));
r = await asUser(db, akis.u.teacher, `insert into dm_conversations (participant_a, participant_b) values ($1, $2)`, [akis.u.teacher, akis.u.admin]);
check("legacy DM between AKIS people still allowed", !r.error, JSON.stringify(r));
r = await asUser(db, akis.u.parent, `insert into feedback (user_id, category, subject, message) values ($1, 'general', 'akis', 'm')`, [akis.u.parent]);
check("AKIS feedback still works with the default center", !r.error, JSON.stringify(r));
r = await asUser(db, akis.u.student, `update assignment_submissions set status = 'submitted' where student_id = $1 and assignment_id = $2`, [akis.u.student, akis.asg]);
check("AKIS student can still resubmit their own homework", !r.error && r.count === 1, JSON.stringify(r));
r = await asUser(db, akis.u.teacher, `update assignment_submissions set status = 'graded', grade = 9 where assignment_id = $1`, [akis.asg]);
check("AKIS teacher can still grade a submission", !r.error && r.count === 1, JSON.stringify(r));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
