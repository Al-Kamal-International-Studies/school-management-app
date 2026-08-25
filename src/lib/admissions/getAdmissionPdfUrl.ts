"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAdmissionPdfFilename } from "./pdfFilename";
import { AKIS_CENTER_ID } from "@/lib/types/database.types";

/**
 * Same two-step "RLS-then-service-role" pattern as getDocumentUrl.ts: first
 * confirm (with the regular client, so the admissions table's admin-only RLS
 * policy applies) that the caller may actually see this admission, then —
 * only if so — mint a short-lived signed URL for the private
 * "admissions-pdfs" bucket via the service-role client.
 *
 * Passes `download` (a string, not just `true`) so the browser saves the
 * file under a meaningful name — <AKIS|AKET>-<enrollment number>-<student
 * name>.pdf — instead of the opaque `<uuid>.pdf` it's actually stored as
 * (see processAdmission in ../../admin/admissions/actions.ts: the storage
 * path itself deliberately stays a random uuid, only the download-facing
 * name changes). Falls back to the raw storage path if the admission
 * hasn't finished processing yet and has no enrollment_number recorded.
 */
export async function getAdmissionPdfUrlAction(admissionId: string): Promise<{ url?: string; error?: string }> {
  await requireRole("admin");

  const supabase = await createClient();
  const { data: admission } = await supabase
    .from("admissions")
    .select("pdf_file_path, student_full_name, enrollment_number, center_id")
    .eq("id", admissionId)
    .single();
  if (!admission) return { error: "Admission not found." };
  if (!admission.pdf_file_path) return { error: "No PDF has been generated for this admission yet." };

  const downloadName = admission.enrollment_number
    ? buildAdmissionPdfFilename({
        center: admission.center_id === AKIS_CENTER_ID ? "akis" : "aket",
        studentFullName: admission.student_full_name,
        enrollmentNumber: admission.enrollment_number,
      })
    : true;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("admissions-pdfs")
    .createSignedUrl(admission.pdf_file_path, 60, { download: downloadName });
  if (error || !data) return { error: error?.message ?? "Could not generate a download link." };

  return { url: data.signedUrl };
}
