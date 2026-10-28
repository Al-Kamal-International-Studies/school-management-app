// 0047_chat_oversight.sql (HANDOVER Part 43): only the chat overseer
// (muhammad@) reads every private and group chat; principal@ does not.
import { makeDb, asUser } from "./load.mjs";
const AKIS = "00000000-0000-0000-0000-000000000001";
const { db, log } = await makeDb();
const failed = log.filter((l) => l.startsWith("FAIL"));
if (failed.length) { console.log(failed.join("\n")); process.exit(1); }

let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "  <<< " + x}`); };

const mk = async (e, role) =>
  (await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1,$2::jsonb) returning id`, [e, JSON.stringify({ full_name: e, role, center_id: AKIS })])).rows[0].id;
// the real address, so the migration's own seeding is what's under test
const muhammadEmail = "muhammad@alkamalinternational.com";
const u = {
  principal: await mk("principal@alkamalinternational.com", "admin"),
  muhammad: await mk(muhammadEmail, "admin"),
  sahar: await mk("sahar@x", "teacher"),
  t2: await mk("t2@x", "teacher"),
  s1: await mk("s1@x", "student"),
};
for (const t of ["sahar", "t2"]) await db.query(`insert into teachers(id, employee_id) values ($1,$2)`, [u[t], t]);
const cls = (await db.query(`insert into classes(name, section, academic_year, center_id) values ('G1','A','2026',$1) returning id`, [AKIS])).rows[0].id;
const sub = (await db.query(`insert into subjects(name, code, center_id) values ('Arabic','AR',$1) returning id`, [AKIS])).rows[0].id;
await db.query(`insert into students(id, enrollment_number, class_id) values ($1,'1',$2)`, [u.s1, cls]);
const cst = (await db.query(`insert into class_subject_teachers(class_id, subject_id, teacher_id) values ($1,$2,$3) returning id`, [cls, sub, u.sahar])).rows[0].id;

// 0047 seeded the overseer at migration time; muhammad@ didn't exist then in
// this fresh DB, so re-run that one seeding statement exactly as written.
await db.query(`insert into chat_overseers (user_id) select id from profiles where email = $1 and role = 'admin' on conflict do nothing`, [muhammadEmail]);

const asService = async (sql, params = []) => {
  await db.exec("reset role; set role service_role;");
  try { return { rows: (await db.query(sql, params)).rows }; } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
let n = 0;
const send = (who, chat, text = "hi") =>
  asService(`select * from public.send_chat_message($1,$2,$3,$4)`, [u[who], chat, text, `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`]);
const open = async (a, b) => (await asService(`select public.open_direct_chat($1,$2) id`, [u[a], u[b]])).rows?.[0]?.id ?? null;
const count = async (who, table, chat) => (await asUser(db, u[who], `select count(*)::int c from ${table} where ${table === "chats" ? "id" : "chat_id"}='${chat}'`)).rows?.[0]?.c;

const dm = await open("sahar", "s1");
await send("sahar", dm, "Read page 4");
await send("s1", dm, "Okay miss");
const group = (await db.query(`select id from chats where cst_id=$1`, [cst])).rows[0].id;
await send("sahar", group, "https://meet.google.com/abc-defg-hij");

console.log("--- who oversees ---");
check("muhammad@ is the overseer", (await db.query(`select public.is_chat_overseer($1) v`, [u.muhammad])).rows[0].v === true);
check("principal@ is NOT an overseer", (await db.query(`select public.is_chat_overseer($1) v`, [u.principal])).rows[0].v === false);

console.log("--- muhammad@ reads everything ---");
check("muhammad reads Sahar<->student private chat", (await count("muhammad", "chat_messages", dm)) === 2);
check("muhammad reads the chat row", (await count("muhammad", "chats", dm)) === 1);
check("muhammad reads the subject group", (await count("muhammad", "chat_messages", group)) === 1);
let r = await send("muhammad", dm, "intrude");
check("muhammad can NOT post into other people's private chat", /not_allowed/.test(r.error ?? ""), JSON.stringify(r));
r = await send("muhammad", group, "Good morning class");
check("muhammad can post in a subject group", !r.error, JSON.stringify(r));
await asUser(db, u.muhammad, `select public.mark_chat_read('${dm}', now())`);
const rc = (await db.query(`select count(*)::int c from chat_receipts where chat_id=$1 and user_id=$2`, [dm, u.muhammad])).rows[0].c;
check("reading someone's private chat leaves no 'read' receipt", rc === 0);
r = await asUser(db, u.muhammad, `select chat_id from public.my_chats()`);
check("other people's private chats stay out of muhammad's own inbox", !r.rows.some((x) => x.chat_id === dm), JSON.stringify(r));

console.log("--- principal@ does not ---");
check("principal can NOT read Sahar<->student private chat", (await count("principal", "chat_messages", dm)) === 0);
check("principal can NOT read the subject group", (await count("principal", "chat_messages", group)) === 0);
r = await send("principal", group, "hello class");
check("principal can NOT post in the subject group", /not_allowed/.test(r.error ?? ""), JSON.stringify(r));
const pdm = await open("principal", "s1");
r = await send("principal", pdm, "Well done this week");
check("principal can still message any student directly", !!pdm && !r.error, JSON.stringify(r));

console.log("--- the overseer list can't be touched from a browser ---");
r = await asUser(db, u.principal, `insert into chat_overseers(user_id) values ('${u.principal}')`);
check("principal can't make herself an overseer", !!r.error, JSON.stringify(r));
r = await asUser(db, u.principal, `select count(*)::int c from chat_overseers`);
check("the overseer list isn't readable from a browser", r.rows?.[0]?.c === 0 || !!r.error, JSON.stringify(r));
r = await asUser(db, u.muhammad, `delete from chat_overseers`);
await db.exec("reset role");
check("not even muhammad can edit the list from a browser", (await db.query(`select count(*)::int c from chat_overseers`)).rows[0].c === 1);

console.log("--- unchanged rules ---");
check("teachers still can't message each other", (await db.query(`select public.can_start_chat($1,$2) ok`, [u.sahar, u.t2])).rows[0].ok === false);
check("...in either direction", (await open("t2", "sahar")) === null);
check("students can't read others' chats", (await count("s1", "chat_messages", pdm)) === 1 && (await asUser(db, u.t2, `select count(*)::int c from chat_messages where chat_id='${dm}'`)).rows[0].c === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
