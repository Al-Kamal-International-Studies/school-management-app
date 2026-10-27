import { createClient } from "@/lib/supabase/server";
import { AKIS_CENTER_ID } from "@/lib/types/database.types";
import type { Admission, ClassRow, OutboundEmail } from "@/lib/types/database.types";

export interface AdmissionListRow extends Pick<Admission, "id" | "status" | "student_full_name" | "center_id" | "registration_date" | "created_at"> {
  centerShortCode: "AKIS";
}

export async function listAdmissions(): Promise<AdmissionListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admissions")
    .select("id, status, student_full_name, center_id, registration_date, created_at")
    // Explicit AKIS scope (HANDOVER Part 37): RLS alone would still show a
    // multi-grant admin the admissions of the removed AKET center.
    .eq("center_id", AKIS_CENTER_ID)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => ({ ...row, centerShortCode: "AKIS" as const }));
}

export async function getAdmission(id: string): Promise<Admission | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("admissions").select("*").eq("id", id).eq("center_id", AKIS_CENTER_ID).maybeSingle();
  return data;
}

/** AKIS classes for the intake form's Level/Grade dropdown. */
export async function listClassesForAdmissionSelect(): Promise<Pick<ClassRow, "id" | "name" | "section" | "center_id">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, section, center_id").eq("center_id", AKIS_CENTER_ID).order("name");
  return data ?? [];
}

/** Powers the pending-outbound-emails panel on /admin/admissions — see 0036_outbound_emails.sql. */
export async function listPendingOutboundEmails(): Promise<OutboundEmail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outbound_emails")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}
