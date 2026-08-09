import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database.types";

export async function getOwnAccountDetails(userId: string, role: UserRole) {
  const supabase = await createClient();

  if (role === "teacher") {
    const { data } = await supabase.from("teachers").select("employee_id, qualification, joining_date").eq("id", userId).single();
    return { teacher: data, student: null, className: null };
  }

  if (role === "student") {
    const { data: student } = await supabase
      .from("students")
      .select("enrollment_number, class_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship")
      .eq("id", userId)
      .single();

    let className: string | null = null;
    if (student?.class_id) {
      const { data: classRow } = await supabase.from("classes").select("name, section").eq("id", student.class_id).single();
      className = classRow ? `${classRow.name} - ${classRow.section}` : null;
    }

    return { teacher: null, student, className };
  }

  return { teacher: null, student: null, className: null };
}
