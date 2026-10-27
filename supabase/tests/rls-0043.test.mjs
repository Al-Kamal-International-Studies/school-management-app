// Verifies migration 0043 against the real migration history in a local
// Postgres: (BEFORE) bugs reproduce, (AFTER) bugs are gone AND legitimate app
// access paths still work for every role.
import { makeDb, asUser } from "./load.mjs";
import { readFileSync } from "node:fs";

const AKIS = "00000000-0000-0000-0000-000000000001";
const AKET = "00000000-0000-0000-0000-000000000002";
let pass = 0, failN = 0;
const check = (name, ok, extra = "") => { (ok ? pass++ : failN++); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  <<< " + extra}`); };

async function build(applyFix) {
  const { db, log } = await makeDb({ upTo: 42 });
  if (log.some((l) => l.startsWith("FAIL"))) console.log(log.filter((l) => l.startsWith("FAIL")).join("\n"));
  if (applyFix) {
    try { await db.exec(readFileSync(new URL("../migrations/0043_audit_hardening.sql", import.meta.url), "utf-8")); }
    catch (e) { console.log("MIGRATION 0043 FAILED:", e.message); process.exit(1); }
  }
  const mk = async (email, role, name, center = AKIS) =>
    (await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`, [email, JSON.stringify({ full_name: name, role, center_id: center })])).rows[0].id;
  const u = {
    admin: await mk("admin@x", "admin", "Admin"),
    principal: await mk("principal@x", "admin", "Principal"),
    adminAket: await mk("adminaket@x", "admin", "AdminAket", AKET),
    t1: await mk("t1@x", "teacher", "T1"),
    t2: await mk("t2@x", "teacher", "T2"),
    t3: await mk("t3@x", "teacher", "T3 homeroom only"),
    tAut: await mk("taut@x", "teacher", "Autism teacher"),
    s1: await mk("s1@x", "student", "S1"),
    s2: await mk("s2@x", "student", "S2"),
    s3: await mk("s3@x", "student", "S3 other class"),
    sAket: await mk("saket@x", "student", "S AKET", AKET),
    p1: await mk("p1@x", "parent", "P1"),
    p2: await mk("p2@x", "parent", "P2"),
  };
  await db.exec(`insert into profile_center_access(profile_id, center_id) values ('${u.principal}','${AKET}') on conflict do nothing`);
  for (const t of ["t1", "t2", "t3", "tAut"]) await db.exec(`insert into teachers(id, employee_id) values ('${u[t]}','${t}')`);
  const mkClass = async (name, hr, center = AKIS) => (await db.query(`insert into classes(name, section, academic_year, center_id, homeroom_teacher_id) values ($1,'A','2026',$2,$3) returning id`, [name, center, hr])).rows[0].id;
  const clsA = await mkClass("A", u.t3);
  const clsB = await mkClass("B", null);
  const clsK = await mkClass("K", null, AKET);
  const subj = (await db.query(`insert into subjects(name, code, center_id) values ('Math','MATH',$1) returning id`, [AKIS])).rows[0].id;
  const subj2 = (await db.query(`insert into subjects(name, code, center_id) values ('Eng','ENG',$1) returning id`, [AKIS])).rows[0].id;
  await db.exec(`insert into students(id, enrollment_number, class_id, guardian_phone, is_autistic) values
    ('${u.s1}','S1','${clsA}','111',false),('${u.s2}','S2','${clsA}','222',true),('${u.s3}','S3','${clsB}','333',false),('${u.sAket}','SK','${clsK}','444',false)`);
  await db.exec(`insert into class_subject_teachers(class_id, subject_id, teacher_id) values
    ('${clsA}','${subj}','${u.t1}'),('${clsA}','${subj2}','${u.t2}'),('${clsB}','${subj}','${u.t1}')`);
  await db.exec(`insert into parent_students(parent_id, student_id) values ('${u.p1}','${u.s1}'),('${u.p2}','${u.s3}')`);
  await db.exec(`insert into autism_assignments(teacher_id, student_id) values ('${u.tAut}','${u.s2}')`);
  const asgA = (await db.query(`insert into assignments(class_id, subject_id, teacher_id, title, due_date) values ('${clsA}','${subj}','${u.t1}','A1', current_date+3) returning id`)).rows[0].id;
  const asgB = (await db.query(`insert into assignments(class_id, subject_id, teacher_id, title, due_date) values ('${clsB}','${subj}','${u.t1}','B1', current_date+3) returning id`)).rows[0].id;
  return { db, u, clsA, clsB, clsK, subj, asgA, asgB };
}

// ---------------- BEFORE -----------------
console.log("=== BEFORE 0043 (bugs must reproduce) ===");
{
  const { db, u, asgA, asgB } = await build(false);
  await db.exec(`insert into assignment_submissions(assignment_id, student_id, status) values ('${asgA}','${u.s1}','pending')`);
  let r = await asUser(db, u.s1, `update assignment_submissions set status='submitted' where student_id='${u.s1}'`);
  check("BEFORE: student submit hits infinite recursion (bug reproduces)", /infinite recursion/.test(r.error ?? ""));
  r = await asUser(db, u.t1, `update assignment_submissions set status='graded', grade=70 where student_id='${u.s1}'`);
  check("BEFORE: teacher grading hits infinite recursion (bug reproduces)", /infinite recursion/.test(r.error ?? ""));
  r = await asUser(db, u.s2, `insert into assignment_submissions(assignment_id, student_id, status, grade) values ('${asgA}','${u.s2}','graded',99)`);
  check("BEFORE: student can insert pre-graded submission (bug reproduces)", !r.error);
  r = await asUser(db, u.s3, `select count(*)::int n from students`);
  check("BEFORE: student sees all students (bug reproduces)", r.rows[0].n === 4);
  r = await asUser(db, u.admin, `insert into profile_center_access(profile_id, center_id) values ('${u.admin}','${AKET}')`);
  check("BEFORE: AKIS admin can self-grant AKET (bug reproduces)", !r.error);
}

// ---------------- AFTER -----------------
console.log("\n=== AFTER 0043 ===");
const { db, u, clsA, clsB, subj, asgA, asgB } = await build(true);
const q = (who, sql) => asUser(db, u[who], sql);

// 1. profile_center_access
let r = await q("admin", `insert into profile_center_access(profile_id, center_id) values ('${u.admin}','${AKET}')`);
check("center: AKIS-only admin CANNOT self-grant AKET", !!r.error, JSON.stringify(r));
r = await q("admin", `insert into profile_center_access(profile_id, center_id) values ('${u.s1}','${AKET}')`);
check("center: AKIS-only admin CANNOT grant AKET to another user", !!r.error);
r = await q("principal", `insert into profile_center_access(profile_id, center_id) values ('${u.t1}','${AKET}')`);
check("center: principal (holds AKET) CAN grant AKET", !r.error, JSON.stringify(r));
r = await q("principal", `delete from profile_center_access where profile_id='${u.t1}' and center_id='${AKET}'`);
check("center: principal CAN revoke AKET grant", !r.error && r.count === 1, JSON.stringify(r));
r = await q("admin", `delete from profile_center_access where profile_id='${u.principal}' and center_id='${AKET}'`);
check("center: AKIS-only admin CANNOT revoke principal's AKET", !r.error && r.count === 0, JSON.stringify(r));
r = await q("s1", `insert into profile_center_access(profile_id, center_id) values ('${u.s1}','${AKET}')`);
check("center: student CANNOT self-grant", !!r.error);
r = await q("admin", `select count(*)::int n from profile_center_access where profile_id='${u.admin}'`);
check("center: admin can still read own grant", r.rows[0].n === 1);

// 2. assignment_submissions
r = await q("s1", `insert into assignment_submissions(assignment_id, student_id, status, submitted_at) values ('${asgA}','${u.s1}','submitted', now())`);
check("subm: student can submit own work (INSERT)", !r.error, JSON.stringify(r));
r = await q("s1", `insert into assignment_submissions(assignment_id, student_id, status, submitted_at) values ('${asgA}','${u.s1}','submitted', now()) on conflict (assignment_id, student_id) do update set status='submitted', submitted_at=now()`);
check("subm: student upsert (app's real call shape) works", !r.error, JSON.stringify(r));
r = await q("s2", `insert into assignment_submissions(assignment_id, student_id, status, grade) values ('${asgA}','${u.s2}','graded',99)`);
check("subm: student CANNOT insert pre-graded", !!r.error);
r = await q("s2", `insert into assignment_submissions(assignment_id, student_id, status, grade) values ('${asgA}','${u.s2}','submitted',50)`);
check("subm: student CANNOT insert with a grade even if status=submitted", !!r.error);
r = await q("s2", `insert into assignment_submissions(assignment_id, student_id, status, feedback) values ('${asgA}','${u.s2}','submitted','great')`);
check("subm: student CANNOT insert with feedback", !!r.error);
r = await q("s3", `insert into assignment_submissions(assignment_id, student_id, status) values ('${asgA}','${u.s3}','submitted')`);
check("subm: student CANNOT submit to another class's assignment", !!r.error);
r = await q("s1", `insert into assignment_submissions(assignment_id, student_id, status) values ('${asgA}','${u.s2}','submitted')`);
check("subm: student CANNOT insert as another student", !!r.error);
r = await q("s1", `update assignment_submissions set grade=100 where student_id='${u.s1}'`);
check("subm: student CANNOT self-grade via UPDATE", !!r.error || r.count === 0, JSON.stringify(r));
r = await q("s1", `update assignment_submissions set status='graded' where student_id='${u.s1}'`);
check("subm: student CANNOT mark own submission graded via UPDATE", !!r.error || r.count === 0, JSON.stringify(r));
r = await q("s1", `update assignment_submissions set feedback='x' where student_id='${u.s1}'`);
check("subm: student CANNOT edit feedback", !!r.error || r.count === 0, JSON.stringify(r));
r = await q("t1", `update assignment_submissions set status='graded', grade=70, feedback='good' where student_id='${u.s1}' and assignment_id='${asgA}'`);
check("subm: teacher CAN grade (UPDATE)", !r.error && r.count === 1, JSON.stringify(r));
r = await q("t1", `insert into assignment_submissions(assignment_id, student_id, status, grade) values ('${asgA}','${u.s2}','graded',80) on conflict (assignment_id, student_id) do update set status='graded', grade=80`);
check("subm: teacher CAN grade via upsert (app's real call shape; row doesn't exist yet)", !r.error, JSON.stringify(r));
r = await q("s1", `update assignment_submissions set status='submitted' where student_id='${u.s1}' and assignment_id='${asgA}'`);
check("subm: student CANNOT touch a graded submission", !!r.error || r.count === 0, JSON.stringify(r));
r = await q("t2", `update assignment_submissions set grade=1 where student_id='${u.s1}'`);
check("subm: another teacher (not the assignment's) CANNOT grade", !!r.error || r.count === 0, JSON.stringify(r));
r = await q("s1", `select count(*)::int n from assignment_submissions`);
check("subm: student reads only own submissions", r.rows[0].n === 1, JSON.stringify(r));
r = await q("p1", `select count(*)::int n from assignment_submissions`);
check("subm: parent sees linked child's submissions", r.rows[0].n === 1, JSON.stringify(r));

// 3. students
r = await q("s1", `select id from students`);
check("students: student sees ONLY self", r.rows.length === 1 && r.rows[0].id === u.s1, JSON.stringify(r.rows?.length));
r = await q("p1", `select id from students`);
check("students: parent sees ONLY own child", r.rows.length === 1 && r.rows[0].id === u.s1);
r = await q("p2", `select id from students`);
check("students: other parent sees ONLY own child", r.rows.length === 1 && r.rows[0].id === u.s3);
r = await q("t1", `select id from students`);
check("students: teacher of A+B sees students of A and B (3), not AKET", r.rows.length === 3, String(r.rows?.length));
r = await q("t2", `select id from students`);
check("students: teacher of A only sees A's 2 students", r.rows.length === 2, String(r.rows?.length));
r = await q("t3", `select id from students`);
check("students: homeroom-only teacher sees their class's 2 students", r.rows.length === 2, String(r.rows?.length));
r = await q("tAut", `select id from students`);
check("students: autism-assigned teacher sees ONLY the assigned student", r.rows.length === 1 && r.rows[0].id === u.s2, String(r.rows?.length));
r = await q("admin", `select id from students`);
check("students: AKIS admin sees the 3 AKIS students, not AKET's", r.rows.length === 3 && !r.rows.some((x) => x.id === u.sAket), String(r.rows?.length));
r = await q("principal", `select id from students`);
check("students: principal (both centers) sees all 4", r.rows.length === 4, String(r.rows?.length));
r = await q("adminAket", `select id from students`);
check("students: AKET admin sees ONLY the AKET student", r.rows.length === 1 && r.rows[0].id === u.sAket, String(r.rows?.length));
r = await q("s1", `select guardian_phone from students where id='${u.s2}'`);
check("students: student cannot read a classmate's guardian phone", r.rows.length === 0);
r = await q("s1", `update students set class_id='${clsB}' where id='${u.s1}'`);
check("students: student still cannot change own class (write unchanged)", !!r.error || r.count === 0);
// app query shapes
r = await q("t1", `select id, enrollment_number from students where class_id='${clsA}'`);
check("app: teacher roster query (attendance/assignments) works", r.rows.length === 2);
r = await q("s1", `select class_id from students where id='${u.s1}'`);
check("app: student own class lookup works", r.rows[0]?.class_id === clsA);
r = await q("p1", `select * from students where id in ('${u.s1}')`);
check("app: parent children query works", r.rows.length === 1);
r = await q("tAut", `select id from students where is_autistic = true and id in ('${u.s2}','${u.s1}')`);
check("app: autism access check (is_autistic among ids) works for assigned teacher", r.rows.length === 1);
r = await q("t1", `select public.can_message('${u.t1}','${u.p1}') as ok`);
check("app: can_message teacher->parent unaffected", r.rows[0].ok === true, JSON.stringify(r));
r = await q("s1", `select count(*)::int n from assignments`);
check("app: student still reads class assignments (policy chain through students)", r.rows[0].n === 1, JSON.stringify(r));
r = await q("p1", `select count(*)::int n from assignments`);
check("app: parent still reads child's class assignments", r.rows[0].n === 1, JSON.stringify(r));

// 4. attendance
const today = new Date().toISOString().slice(0, 10);
r = await q("t1", `insert into attendance_records(student_id, class_id, date, status, marked_by) values ('${u.s1}','${clsA}','${today}','absent','${u.t1}')`);
check("attend: teacher1 can mark", !r.error, JSON.stringify(r));
r = await q("t2", `select count(*)::int n from attendance_records where class_id='${clsA}'`);
check("attend: teacher2 (same class) now SEES teacher1's marks", r.rows[0].n === 1, JSON.stringify(r));
r = await q("t2", `insert into attendance_records(student_id, class_id, date, status, marked_by) values ('${u.s1}','${clsA}','${today}','present','${u.t2}') on conflict (student_id, date) do update set status='present', marked_by='${u.t2}'`);
check("attend: teacher2 can re-mark via upsert (app's real call shape)", !r.error, JSON.stringify(r));
r = await q("t3", `select count(*)::int n from attendance_records`);
check("attend: homeroom-only teacher (no cst rows) sees none", r.rows[0].n === 0);
r = await q("t1", `update attendance_records set marked_by='${u.t2}' where student_id='${u.s1}'`);
check("attend: cannot forge marked_by as someone else", !!r.error || r.count === 0, JSON.stringify(r));
r = await q("s1", `select count(*)::int n from attendance_records`);
check("attend: student sees own attendance", r.rows[0].n === 1);
r = await q("s3", `select count(*)::int n from attendance_records`);
check("attend: other-class student sees none", r.rows[0].n === 0);
r = await q("p2", `select count(*)::int n from attendance_records`);
check("attend: unrelated parent sees none", r.rows[0].n === 0);

// 5. avatar_url constraint
r = await q("s1", `update profiles set avatar_url='http://127.0.0.1:8080/ssrf' where id='${u.s1}'`);
check("avatar: student CANNOT set an arbitrary-host avatar URL", !!r.error, JSON.stringify(r));
r = await q("s1", `update profiles set avatar_url='https://abc.supabase.co/storage/v1/object/public/avatars/${u.s1}/a.png?v=1' where id='${u.s1}'`);
check("avatar: student CAN set a bucket avatar URL", !r.error && r.count === 1, JSON.stringify(r));
r = await q("s1", `update profiles set avatar_url=null where id='${u.s1}'`);
check("avatar: student CAN clear avatar", !r.error && r.count === 1, JSON.stringify(r));
r = await q("s1", `update profiles set phone='123' where id='${u.s1}'`);
check("profile: unrelated self-update still works", !r.error && r.count === 1, JSON.stringify(r));

// 6. leave requests
r = await q("s1", `insert into leave_requests(student_id, reason, start_date, end_date, status) values ('${u.s1}','x', current_date, current_date, 'approved')`);
check("leave: student CANNOT insert an already-approved request", !!r.error);
r = await q("s1", `insert into leave_requests(student_id, reason, start_date, end_date, status, reviewed_by) values ('${u.s1}','x', current_date, current_date, 'pending', '${u.admin}')`);
check("leave: student CANNOT spoof reviewed_by", !!r.error);
r = await q("s1", `insert into leave_requests(student_id, reason, start_date, end_date) values ('${u.s1}','sick', current_date, current_date)`);
check("leave: student CAN submit a normal pending request (default status)", !r.error, JSON.stringify(r));
r = await q("p1", `insert into leave_requests(student_id, reason, start_date, end_date, status) values ('${u.s1}','x', current_date, current_date, 'approved')`);
check("leave: parent CANNOT insert an already-approved request", !!r.error);
r = await q("p1", `insert into leave_requests(student_id, reason, start_date, end_date) values ('${u.s1}','family', current_date, current_date)`);
check("leave: parent CAN submit a pending request for own child", !r.error, JSON.stringify(r));
r = await q("p2", `insert into leave_requests(student_id, reason, start_date, end_date) values ('${u.s1}','x', current_date, current_date)`);
check("leave: unrelated parent CANNOT submit for someone else's child", !!r.error);
r = await q("admin", `update leave_requests set status='approved', reviewed_by='${u.admin}' where student_id='${u.s1}' and reason='sick'`);
check("leave: admin CAN approve", !r.error && r.count === 1, JSON.stringify(r));
r = await q("s1", `update leave_requests set status='approved' where student_id='${u.s1}'`);
check("leave: student CANNOT approve own request via UPDATE", !!r.error || r.count === 0);

console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
