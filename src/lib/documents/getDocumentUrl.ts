"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Two-step, RLS-then-service-role pattern: first confirm (with the regular
 * client, so RLS applies) that the caller is actually allowed to see this
 * document, then — only if so — use the service-role client to mint a
 * short-lived signed URL for the private "documents" bucket. Never returns
 * a URL for a document the caller isn't authorized to see.
 */
export async function getDocumentUrlAction(documentId: string): Promise<{ url?: string; error?: string }> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("file_path").eq("id", documentId).single();
  if (!doc) return { error: "Document not found." };

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("documents").createSignedUrl(doc.file_path, 60);
  if (error || !data) return { error: error?.message ?? "Could not generate a download link." };

  return { url: data.signedUrl };
}
