"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function submitAssignmentAction(assignmentId: string) {
  const me = await requireRole("student");
  const supabase = await createClient();
  const { error } = await supabase.from("assignment_submissions").upsert(
    { assignment_id: assignmentId, student_id: me.id, status: "submitted", submitted_at: new Date().toISOString() },
    { onConflict: "assignment_id,student_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/student/assignments");
}
