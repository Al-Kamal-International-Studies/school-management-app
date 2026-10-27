// 0045_admissions_created_by_nullable.sql (HANDOVER Part 41): deleting an admin who
// created an admission must succeed and keep the admission (creator becomes NULL).
import { makeDb } from "./load.mjs";
const AKIS = "00000000-0000-0000-0000-000000000001";
let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : "  <<< " + x}`); };
async function scenario(upTo) {
  const { db } = await makeDb({ upTo });
  const a = (await db.query(`insert into auth.users (email, raw_user_meta_data) values ('a@x', $1::jsonb) returning id`, [JSON.stringify({ full_name: "a", role: "admin", center_id: AKIS })])).rows[0].id;
  await db.query(`insert into admissions(center_id, student_full_name, student_gender, consent_accepted, payment_policy_accepted, created_by) values ($1,'kid','male',true,true,$2)`, [AKIS, a]);
  try { await db.query(`delete from auth.users where id = $1`, [a]); } catch (e) { return { error: e.message, db }; }
  return { db };
}
let r = await scenario(44);
check("before 0045: deleting the creating admin fails (the bug)", /created_by/.test(r.error ?? ""), JSON.stringify(r.error));
r = await scenario(45);
check("after 0045: deleting the creating admin succeeds", !r.error, r.error);
const rows = (await r.db.query(`select created_by from admissions`)).rows;
check("the admission is kept, creator set to NULL", rows.length === 1 && rows[0].created_by === null, JSON.stringify(rows));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
