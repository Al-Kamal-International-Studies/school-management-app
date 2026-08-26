import { createClient } from "@/lib/supabase/server";

/** Scoped to the active center — documents has its own center_id (see 0027_centers.sql), so this filters directly rather than via a join. */
export async function listAllDocuments(activeCenterId: string) {
  const supabase = await createClient();
  const { data: docs } = await supabase.from("documents").select("*").eq("center_id", activeCenterId).order("created_at", { ascending: false });
  if (!docs || docs.length === 0) return [];

  const studentIds = [...new Set(docs.map((d) => d.student_id).filter((id): id is string => !!id))];
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return docs.map((d) => ({ ...d, studentName: d.student_id ? nameMap.get(d.student_id) ?? "Unknown" : null }));
}

/** For the "attach to a student" dropdown on the upload form — scoped to the active center. */
export async function listStudentsForSelect(activeCenterId: string) {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student")
    .eq("center_id", activeCenterId)
    .order("full_name");
  return profiles ?? [];
}
