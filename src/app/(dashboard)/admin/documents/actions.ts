"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log";

export interface ActionState {
  error?: string;
}

const metaSchema = z.object({
  title: z.string().min(1, "Title is required."),
  category: z.enum(["admit_card", "report_card", "certificate", "policy", "general"]),
  audience: z.enum(["all", "teacher", "student"]),
  student_id: z.string().optional(),
});

/**
 * Uploads to the private "documents" Storage bucket via the service-role
 * admin client (the bucket has no public policies — see migration
 * 0011_operations.sql). The `documents` table row is what actually governs
 * who can later fetch a signed URL for the file (see getDocumentUrl.ts).
 */
export async function uploadDocumentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > 10 * 1024 * 1024) return { error: "File must be under 10MB." };

  const parsed = metaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage.from("documents").upload(path, buffer, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError, data: inserted } = await admin
    .from("documents")
    .insert({
      title: parsed.data.title,
      category: parsed.data.category,
      audience: parsed.data.audience,
      student_id: parsed.data.student_id || null,
      file_path: path,
      uploaded_by: me.id,
    })
    .select("id")
    .single();
  if (insertError) {
    await admin.storage.from("documents").remove([path]);
    return { error: insertError.message };
  }

  await logAuditEvent(me.id, "upload_document", "documents", inserted.id, { title: parsed.data.title });

  revalidatePath("/admin/documents");
  revalidatePath("/documents");
  return {};
}

export async function deleteDocumentAction(id: string, filePath: string) {
  const me = await requireRole("admin");
  const admin = createAdminClient();
  await admin.storage.from("documents").remove([filePath]);
  const { error } = await admin.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAuditEvent(me.id, "delete_document", "documents", id);
  revalidatePath("/admin/documents");
  revalidatePath("/documents");
}
