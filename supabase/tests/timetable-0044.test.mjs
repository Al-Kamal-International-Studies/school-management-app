// 0044_timetable_no_overlaps.sql (HANDOVER Part 41): no class and no teacher can
// ever hold two overlapping periods, whoever writes them.
import { makeDb, asUser } from "./load.mjs";
const AKIS = "00000000-0000-0000-0000-000000000001";
const { db, log } = await makeDb();
const failed = log.filter((l) => l.startsWith("FAIL"));
if (failed.length) { console.log(failed.join("\n")); process.exit(1); }

const mk = async (e, r) => (await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1,$2::jsonb) returning id`, [e, JSON.stringify({ full_name: e, role: r, center_id: AKIS })])).rows[0].id;
const t1 = await mk("t1@x", "teacher"), t2 = await mk("t2@x", "teacher"), adm = await mk("a@x", "admin");
for (const [t, n] of [[t1, "E1"], [t2, "E2"]]) await db.query(`insert into teachers(id, employee_id) values ($1,$2)`, [t, n]);
const cls = async (n) => (await db.query(`insert into classes(name, section, academic_year, center_id) values ($1,'A','2026',$2) returning id`, [n, AKIS])).rows[0].id;
const c1 = await cls("Grade 1"), c2 = await cls("Grade 2");
const sub = (await db.query(`insert into subjects(name, code, center_id) values ('Maths','M',$1) returning id`, [AKIS]).catch(() => db.query(`insert into subjects(name) values ('Maths') returning id`))).rows[0].id;

let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "  <<< " + x}`); };
const add = (who, c, t, day, s, e) =>
  asUser(db, who, `insert into timetable_entries(class_id, subject_id, teacher_id, day_of_week, start_time, end_time) values ('${c}','${sub}','${t}',${day},'${s}','${e}') returning id`);

let r = await add(t1, c1, t1, 1, "08:00", "08:45");
check("teacher adds a period", !r.error, JSON.stringify(r));
const firstId = r.rows?.[0]?.id;
r = await add(t2, c1, t2, 1, "08:30", "09:15");
check("SAME CLASS, another teacher, overlapping time -> refused", /timetable_no_class_overlap/.test(r.error ?? ""), JSON.stringify(r));
r = await add(adm, c1, t2, 1, "08:00", "08:45");
check("same class, exact same slot, even by an admin -> refused", /timetable_no_class_overlap/.test(r.error ?? ""), JSON.stringify(r));
r = await add(t1, c2, t1, 1, "08:15", "09:00");
check("SAME TEACHER in another class at an overlapping time -> refused", /timetable_no_teacher_overlap/.test(r.error ?? ""), JSON.stringify(r));
r = await add(t2, c2, t2, 1, "08:00", "08:45");
check("different class + different teacher, same time -> allowed", !r.error, JSON.stringify(r));
r = await add(t1, c1, t1, 1, "08:45", "09:30");
check("back-to-back periods (touching, not overlapping) -> allowed", !r.error, JSON.stringify(r));
r = await add(t2, c1, t2, 2, "08:00", "08:45");
check("same class + time on a different day -> allowed", !r.error, JSON.stringify(r));
r = await asUser(db, t2, `update timetable_entries set start_time='08:30', end_time='09:00' where day_of_week=2 and class_id='${c1}'`);
check("moving a period onto a free time -> allowed", !r.error, JSON.stringify(r));
r = await asUser(db, t1, `update timetable_entries set day_of_week=1, start_time='08:00', end_time='08:45' where day_of_week=2 and class_id='${c1}'`);
check("EDITING a period onto an occupied slot -> refused", /overlap/.test(r.error ?? ""), JSON.stringify(r));
r = await asUser(db, t1, `update timetable_entries set room='Lab' where id='${firstId}'`);
check("editing a period in place (no time change) -> allowed", !r.error, JSON.stringify(r));
r = await db.query(`select count(*)::int n from timetable_entries`);
check("exactly the 4 legitimate periods exist", r.rows[0].n === 4, JSON.stringify(r.rows));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
