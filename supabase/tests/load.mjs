// Loads the project's real migrations (0001..N) into an in-process Postgres
// (PGlite) behind a minimal Supabase shim (auth schema, roles, storage stubs),
// so RLS policies can be exercised exactly as PostgREST would (SET ROLE
// authenticated + request.jwt.claim.sub). Used to verify new migrations
// BEFORE anyone runs them against production.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIG = fileURLToPath(new URL("../migrations", import.meta.url));

const SHIM = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant select on all tables in schema storage to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt(), storage.foldername(text) to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export async function makeDb({ upTo = 999, extraDir } = {}) {
  // btree_gist: 0044 (timetable exclusion constraints). Supabase keeps
  // extensions in their own schema, mirrored here.
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(SHIM);
  await db.exec("create schema if not exists extensions;");
  const files = readdirSync(MIG).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
  const log = [];
  for (const f of files) {
    const n = parseInt(f.slice(0, 4), 10);
    if (n > upTo) break;
    try {
      await db.exec(readFileSync(path.join(MIG, f), "utf-8").replace(/create extension if not exists "?pgcrypto"?[^;]*;/gi, ""));
      log.push(`ok   ${f}`);
    } catch (e) {
      log.push(`FAIL ${f}: ${e.message}`);
    }
  }
  if (extraDir) {
    for (const f of readdirSync(extraDir).filter((f) => f.endsWith(".sql")).sort()) {
      try {
        await db.exec(readFileSync(path.join(extraDir, f), "utf-8"));
        log.push(`ok   (extra) ${f}`);
      } catch (e) {
        log.push(`FAIL (extra) ${f}: ${e.message}`);
      }
    }
  }
  return { db, log };
}

/** Run `fn` as an authenticated user (like PostgREST does). Returns rows or {error}. */
export async function asUser(db, userId, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId}', false), set_config('request.jwt.claim.role', 'authenticated', false); set role authenticated;`);
  try {
    const r = await db.query(sql, params);
    return { rows: r.rows, count: r.affectedRows ?? r.rows.length };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec("reset role");
  }
}
