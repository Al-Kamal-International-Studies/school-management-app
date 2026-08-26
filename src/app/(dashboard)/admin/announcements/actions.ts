"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/notifications/notify";
import { logAuditEvent } from "@/lib/audit/log";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

export interface ActionState {
  error?: string;
}

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required."),
  body: z.string().min(1, "Message is required."),
  audience: z.enum(["all", "teacher", "student", "parent"]),
});

export async function createAnnouncementAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const parsed = announcementSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  // Without an explicit center_id, this insert falls back to the column's
  // schema default (AKIS — see 0027_centers.sql) regardless of which
  // center the admin is actually looking at. `me.center_id` is
  // deliberately NOT used here — that's the admin's own home center, not
  // necessarily the one they're currently working in.
  const activeCenterId = (await getActiveCenterForRequest())!;
  const { data: created, error } = await supabase
    .from("announcements")
    .insert({ ...parsed.data, created_by: me.id, center_id: activeCenterId })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logAuditEvent(me.id, "create_announcement", "announcements", created.id, { title: parsed.data.title, audience: parsed.data.audience });

  // Best-effort notify — never blocks the announcement from being saved.
  // Scoped to the same center the announcement itself belongs to — without
  // this, an AKET-only announcement would still push a notification to
  // every AKIS user too (and vice versa), which RLS's own
  // has_center_access(center_id) read policy on `announcements` never
  // actually let them see once they opened it.
  const admin = createAdminClient();
  let recipients = admin.from("profiles").select("id").eq("center_id", activeCenterId).is("archived_at", null);
  if (parsed.data.audience !== "all") recipients = recipients.eq("role", parsed.data.audience);
  const { data: profiles } = await recipients;
  if (profiles?.length) {
    await notifyUsers(
      profiles.map((p) => p.id),
      { type: "announcement", title: parsed.data.title, body: parsed.data.body, url: "/" }
    );
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/student");
  revalidatePath("/teacher");
  return {};
}

export async function deleteAnnouncementAction(id: string) {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAuditEvent(me.id, "delete_announcement", "announcements", id);
  revalidatePath("/admin/announcements");
}
