import { createClient } from "@/lib/supabase/server";
import { AKIS_CENTER_ID } from "@/lib/types/database.types";
import type { Admission, ClassRow, OutboundEmail } from "@/lib/types/database.types";

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

/**
 * Both centers' classes, for the intake form's Level/Grade dropdown
 * (AdmissionForm.tsx filters this client-side by whichever center is
 * currently selected). RLS-scoped like every other classes read in this
 * app — an admin without profile_center_access to AKET (0027_centers.sql's
 * own documented limitation) will simply see zero AKET classes here, same
 * inherited gap already noted for /admin/autism's assign form.
 */
export async function listClassesForAdmissionSelect(): Promise<Pick<ClassRow, "id" | "name" | "section" | "center_id">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, section, center_id").order("name");
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
