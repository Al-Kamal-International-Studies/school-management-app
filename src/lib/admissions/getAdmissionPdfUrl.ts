"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Same two-step "RLS-then-service-role" pattern as getDocumentUrl.ts: first
 * confirm (with the regular client, so the admissions table's admin-only RLS
 * policy applies) that the caller may actually see this admission, then —
 * only if so — mint a short-lived signed URL for the private
 * "admissions-pdfs" bucket via the service-role client.
 */
export async function getAdmissionPdfUrlAction(admissionId: string): Promise<{ url?: string; error?: string }> {
  await requireRole("admin");

  const supabase = await createClient();
  const { data: admission } = await supabase.from("admissions").select("pdf_file_path").eq("id", admissionId).single();
  if (!admission) return { error: "Admission not found." };
  if (!admission.pdf_file_path) return { error: "No PDF has been generated for this admission yet." };

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("admissions-pdfs").createSignedUrl(admission.pdf_file_path, 60);
  if (error || !data) return { error: error?.message ?? "Could not generate a download link." };

  return { url: data.signedUrl };
}
