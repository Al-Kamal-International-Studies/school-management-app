import { createClient } from "@/lib/supabase/server";

export async function listAllDocuments() {
  const supabase = await createClient();
  const { data: docs } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
  if (!docs || docs.length === 0) return [];

  const studentIds = [...new Set(docs.map((d) => d.student_id).filter((id): id is string => !!id))];
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return docs.map((d) => ({ ...d, studentName: d.student_id ? nameMap.get(d.student_id) ?? "Unknown" : null }));
}

export async function listStudentsForSelect() {
  const supabase = await createClient();
  const { data: students } = await supabase.from("students").select("id");
  if (!students || students.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", students.map((s) => s.id))
    .order("full_name");
  return profiles ?? [];
}
