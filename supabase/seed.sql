-- Optional starter reference data. Safe to run once after migrations.
-- (Admin/teacher/student accounts are NOT seeded here — they must go through
-- Supabase Auth so passwords are hashed correctly. Use `npm run create-admin`
-- to bootstrap the first admin account, see README.md.)

insert into subjects (name, code) values
  ('Mathematics', 'MATH'),
  ('English', 'ENG'),
  ('Science', 'SCI'),
  ('Social Studies', 'SOC'),
  ('Computer Science', 'CS'),
  ('Physical Education', 'PE')
on conflict (code) do nothing;
