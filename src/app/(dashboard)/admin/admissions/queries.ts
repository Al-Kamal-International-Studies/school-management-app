import { createClient } from "@/lib/supabase/server";
import { AKIS_CENTER_ID } from "@/lib/types/database.types";
import type { Admission, OutboundEmail } from "@/lib/types/database.types";

export interface AdmissionListRow extends Pick<Admission, "id" | "status" | "student_full_name" | "center_id" | "registration_date" | "created_at"> {
  centerShortCode: "AKIS" | "AKET";
}

export async function listAdmissions(): Promise<AdmissionListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admissions")
    .select("id, status, student_full_name, center_id, registration_date, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => ({ ...row, centerShortCode: row.center_id === AKIS_CENTER_ID ? "AKIS" : "AKET" }));
}

export async function getAdmission(id: string): Promise<Admission | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("admissions").select("*").eq("id", id).single();
  return data;
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
