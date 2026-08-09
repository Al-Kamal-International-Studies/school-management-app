"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send";

export interface ActionState {
  error?: string;
}

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required."),
  body: z.string().min(1, "Message is required."),
  audience: z.enum(["all", "teacher", "student"]),
});

export async function createAnnouncementAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ ...parsed.data, created_by: me.id });
  if (error) return { error: error.message };

  // Best-effort push — never blocks the announcement from being saved.
  const admin = createAdminClient();
  let recipients = admin.from("profiles").select("id").is("archived_at", null);
  if (parsed.data.audience !== "all") recipients = recipients.eq("role", parsed.data.audience);
  const { data: profiles } = await recipients;
  if (profiles?.length) {
    await sendPushToUsers(
      profiles.map((p) => p.id),
      { title: parsed.data.title, body: parsed.data.body, url: "/" }
    );
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/student");
  revalidatePath("/teacher");
  return {};
}

export async function deleteAnnouncementAction(id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/announcements");
}
