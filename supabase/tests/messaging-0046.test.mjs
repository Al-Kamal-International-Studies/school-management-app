// 0046_messaging_v2.sql (HANDOVER Part 42): who may message whom, groups,
// receipts, the server-only send path, and that nobody can write directly.
import { makeDb, asUser } from "./load.mjs";
const AKIS = "00000000-0000-0000-0000-000000000001";
const AKET = "00000000-0000-0000-0000-000000000002";
const { db, log } = await makeDb({ upTo: 46 });
const failed = log.filter((l) => l.startsWith("FAIL"));
if (failed.length) { console.log(failed.join("\n")); process.exit(1); }

let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "  <<< " + x}`); };

const mk = async (e, role, center = AKIS) =>
  (await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1,$2::jsonb) returning id`, [e, JSON.stringify({ full_name: e, role, center_id: center })])).rows[0].id;
const u = {
  principal: await mk("principal@x", "admin"),
  muhammad: await mk("muhammad@x", "admin"),
  sahar: await mk("sahar@x", "teacher"),
  t2: await mk("t2@x", "teacher"),
  tAut: await mk("taut@x", "teacher"),
  s1: await mk("s1@x", "student"),
  s2: await mk("s2@x", "student"),
  s3: await mk("s3@x", "student"),
  p1: await mk("p1@x", "parent"),
  p3: await mk("p3@x", "parent"),
  sAket: await mk("saket@x", "student", AKET),
};
for (const t of ["sahar", "t2", "tAut"]) await db.query(`insert into teachers(id, employee_id) values ($1,$2)`, [u[t], t]);
const cls = async (n) => (await db.query(`insert into classes(name, section, academic_year, center_id) values ($1,'A','2026',$2) returning id`, [n, AKIS])).rows[0].id;
const clsA = await cls("Grade 1"), clsB = await cls("Grade 2");
const sub = async (n, c) => (await db.query(`insert into subjects(name, code, center_id) values ($1,$2,$3) returning id`, [n, c, AKIS])).rows[0].id;
const arabic = await sub("Arabic", "AR"), maths = await sub("Maths", "MA");
await db.query(`insert into students(id, enrollment_number, class_id) values ($1,'1',$4),($2,'2',$4),($3,'3',$5)`, [u.s1, u.s2, u.s3, clsA, clsB]);
// Sahar teaches Arabic to Grade 1 only; t2 teaches Maths to Grade 2 only
const cstSahar = (await db.query(`insert into class_subject_teachers(class_id, subject_id, teacher_id) values ($1,$2,$3) returning id`, [clsA, arabic, u.sahar])).rows[0].id;
const cstT2 = (await db.query(`insert into class_subject_teachers(class_id, subject_id, teacher_id) values ($1,$2,$3) returning id`, [clsB, maths, u.t2])).rows[0].id;
await db.query(`insert into parent_students(parent_id, student_id) values ($1,$2),($3,$4)`, [u.p1, u.s1, u.p3, u.s3]);

const can = async (a, b) => (await db.query(`select public.can_start_chat($1,$2) ok`, [u[a], u[b]])).rows[0].ok;
const asService = async (sql, params = []) => {
  await db.exec("reset role; set role service_role;");
  try { return { rows: (await db.query(sql, params)).rows }; } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
const open = async (a, b) => (await asService(`select public.open_direct_chat($1,$2) id`, [u[a], u[b]])).rows?.[0]?.id ?? null;
let n = 0;
const send = (who, chat, text = "hello", clientId = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`) =>
  asService(`select * from public.send_chat_message($1,$2,$3,$4)`, [u[who], chat, text, clientId]);

console.log("--- who may START a chat ---");
const matrix = [
  ["principal", "s1", true], ["principal", "sahar", true], ["principal", "p1", true], ["muhammad", "principal", true],
  ["sahar", "s1", true], ["sahar", "s2", true], ["sahar", "s3", false], ["sahar", "principal", true], ["sahar", "muhammad", true],
  ["sahar", "t2", false], ["sahar", "p1", true], ["sahar", "p3", false],
  ["s1", "sahar", true], ["s1", "t2", false], ["s1", "s2", false], ["s1", "principal", false], ["s1", "muhammad", false], ["s1", "p1", false],
  ["p1", "sahar", true], ["p1", "principal", true], ["p1", "t2", false], ["p1", "s1", false],
  ["s3", "t2", true], ["principal", "sAket", false], ["sahar", "sahar", false],
];
for (const [a, b, want] of matrix) check(`${a} -> ${b}: ${want ? "allowed" : "blocked"}`, (await can(a, b)) === want);

console.log("--- direct chats + sending ---");
const chatSaharS1 = await open("sahar", "s1");
check("Sahar opens a chat with her student", !!chatSaharS1);
check("opening again returns the same chat", (await open("s1", "sahar")) === chatSaharS1);
check("student cannot open a chat with a classmate", (await open("s1", "s2")) === null);
check("student cannot open a chat with the principal", (await open("s1", "principal")) === null);
let r = await send("sahar", chatSaharS1, "Read page 4");
check("Sahar sends to her student", !r.error && r.rows[0].content === "Read page 4", JSON.stringify(r));
r = await send("s1", chatSaharS1, "Okay miss");
check("student replies", !r.error, JSON.stringify(r));
r = await send("s2", chatSaharS1, "intruder");
check("a non-member cannot post in someone else's chat", /not_allowed/.test(r.error ?? ""), JSON.stringify(r));

const fixedClient = "11111111-1111-4111-8111-111111111111";
const first = await send("sahar", chatSaharS1, "once", fixedClient);
const again = await send("sahar", chatSaharS1, "once", fixedClient);
check("retrying with the same client_id does not duplicate", first.rows[0].id === again.rows[0].id);

const chatPrincipalS1 = await open("principal", "s1");
check("principal opens a chat with a student", !!chatPrincipalS1);
r = await send("s1", chatPrincipalS1, "Thank you");
check("student can REPLY in a chat the principal started", !r.error, JSON.stringify(r));

console.log("--- direct writes are impossible ---");
r = await asUser(db, u.s1, `insert into chat_messages(chat_id, sender_id, content, client_id) values ('${chatSaharS1}','${u.s1}','bypass filter', gen_random_uuid())`);
check("student cannot INSERT a message directly (must go through the filter)", !!r.error, JSON.stringify(r));
r = await asUser(db, u.s1, `insert into chats(kind, user_a, user_b) values ('direct', least('${u.s1}'::uuid,'${u.s2}'::uuid), greatest('${u.s1}'::uuid,'${u.s2}'::uuid))`);
check("student cannot INSERT a chat directly", !!r.error, JSON.stringify(r));
r = await asUser(db, u.s1, `select public.send_chat_message('${u.s1}','${chatSaharS1}','x', gen_random_uuid())`);
check("browser (authenticated) cannot call send_chat_message", /permission denied/.test(r.error ?? ""), JSON.stringify(r));
r = await asUser(db, u.s1, `select public.open_direct_chat('${u.s1}','${u.s2}')`);
check("browser (authenticated) cannot call open_direct_chat", /permission denied/.test(r.error ?? ""), JSON.stringify(r));

console.log("--- reading ---");
r = await asUser(db, u.s2, `select count(*)::int c from chat_messages where chat_id='${chatSaharS1}'`);
check("classmate cannot read another student's private chat", r.rows[0].c === 0, JSON.stringify(r));
r = await asUser(db, u.s1, `select count(*)::int c from chat_messages where chat_id='${chatSaharS1}'`);
check("participant reads the chat", r.rows[0].c === 3, JSON.stringify(r));
r = await asUser(db, u.muhammad, `select count(*)::int c from chat_messages where chat_id='${chatSaharS1}'`);
check("admins do NOT read other people's private chats", r.rows[0].c === 0, JSON.stringify(r));

console.log("--- subject groups ---");
const groupSahar = (await db.query(`select id from chats where cst_id=$1`, [cstSahar])).rows[0]?.id;
check("a group was created automatically for the new class subject", !!groupSahar);
r = await send("sahar", groupSahar, "Meet link: https://meet.google.com/abc-defg-hij");
check("teacher posts in her subject group", !r.error, JSON.stringify(r));
r = await send("s2", groupSahar, "Joining");
check("student in that class posts in the group", !r.error, JSON.stringify(r));
r = await send("s3", groupSahar, "not my class");
check("student from another class cannot post", /not_allowed/.test(r.error ?? ""), JSON.stringify(r));
r = await asUser(db, u.s3, `select count(*)::int c from chat_messages where chat_id='${groupSahar}'`);
check("student from another class cannot read the group", r.rows[0].c === 0);
r = await send("principal", groupSahar, "Good morning class");
check("admin can post in any group", !r.error, JSON.stringify(r));
r = await send("t2", groupSahar, "wrong teacher");
check("another teacher cannot post in Sahar's group", /not_allowed/.test(r.error ?? ""), JSON.stringify(r));

console.log("--- inbox, unread, receipts ---");
r = await asUser(db, u.s1, `select * from public.my_chats()`);
const s1Sahar = r.rows?.find((x) => x.chat_id === chatSaharS1);
check("my_chats counts only messages after my last read (my reply counts as read)", s1Sahar?.unread === 1, JSON.stringify(s1Sahar));
check("my_chats lists the subject group", !!r.rows?.find((x) => x.chat_id === groupSahar && x.kind === "group"));
r = await asUser(db, u.s1, `select public.mark_all_delivered()`);
const rec = async (who, chat) => (await db.query(`select * from chat_receipts where chat_id=$1 and user_id=$2`, [chat, u[who]])).rows[0];
check("mark_all_delivered sets the delivered mark (=> double tick)", !!(await rec("s1", chatSaharS1))?.delivered_up_to);
{ const x = await rec("s1", chatSaharS1); check("...but read stays behind the newest message", new Date(x.read_up_to) < new Date(x.delivered_up_to), JSON.stringify(x)); }
r = await asUser(db, u.s1, `select public.mark_chat_read('${chatSaharS1}', now() + interval '1 hour')`);
const s1Rec = await rec("s1", chatSaharS1);
check("mark_chat_read sets read (=> blue ticks), clamped to now", !!s1Rec?.read_up_to && new Date(s1Rec.read_up_to) <= new Date(Date.now() + 5000));
r = await asUser(db, u.s1, `select unread from public.my_chats() where chat_id='${chatSaharS1}'`);
check("unread drops to 0 after reading", r.rows[0].unread === 0, JSON.stringify(r));
r = await asUser(db, u.s3, `select public.mark_chat_read('${chatSaharS1}', now())`);
check("a non-member cannot write receipts on someone's chat", !(await rec("s3", chatSaharS1)));
r = await asUser(db, u.sahar, `select count(*)::int c from chat_receipts where chat_id='${chatSaharS1}'`);
check("sender can see the recipient's receipts (to draw ticks)", r.rows[0].c === 2, JSON.stringify(r));
r = await asUser(db, u.s1, `select public.my_unread_total() t`);
check("my_unread_total works", typeof r.rows[0].t === "number", JSON.stringify(r));

console.log("--- contacts ---");
r = await asUser(db, u.sahar, `select id, role, context from public.my_contacts()`);
const ids = new Set(r.rows.map((x) => x.id));
check("Sahar's contacts: her students + management + parents", ids.has(u.s1) && ids.has(u.s2) && ids.has(u.principal) && ids.has(u.muhammad) && ids.has(u.p1));
check("Sahar's contacts exclude other classes' students and teachers", !ids.has(u.s3) && !ids.has(u.t2));
r = await asUser(db, u.s1, `select id, context from public.my_contacts()`);
check("student's contacts are only their teachers", r.rows.length === 1 && r.rows[0].id === u.sahar && r.rows[0].context === "Arabic", JSON.stringify(r.rows));

console.log("--- teacher moved off the class ---");
await db.query(`update class_subject_teachers set teacher_id=$1 where id=$2`, [u.t2, cstSahar]);
r = await send("sahar", chatSaharS1, "still here?");
check("once Sahar no longer teaches the class, she can't message that student", /not_allowed/.test(r.error ?? ""), JSON.stringify(r));
r = await asUser(db, u.sahar, `select count(*)::int c from chat_messages where chat_id='${chatSaharS1}'`);
check("...but the history stays readable", r.rows[0].c === 3);

console.log("--- flood guard ---");
let limited = false;
for (let i = 0; i < 22; i++) { const x = await send("principal", chatPrincipalS1, `m${i}`); if (/rate_limited/.test(x.error ?? "")) { limited = true; break; } }
check("more than 20 messages in 10 seconds is refused", limited);

console.log("--- message_flags ---");
await asService(`insert into message_flags(sender_id, action, content, reasons) values ($1,'blocked','x','{word}')`, [u.s1]);
r = await asUser(db, u.s1, `select count(*)::int c from message_flags`);
check("students cannot read the safety log", r.rows[0].c === 0);
r = await asUser(db, u.principal, `select count(*)::int c from message_flags`);
check("admins can read the safety log", r.rows[0].c === 1);
void cstT2;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
