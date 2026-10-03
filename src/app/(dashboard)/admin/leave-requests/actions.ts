"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/notifications/notify";
import type { LeaveStatus } from "@/lib/types/database.types";

export async function reviewLeaveRequestAction(id: string, status: Extract<LeaveStatus, "approved" | "rejected">) {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { data: request } = await supabase.from("leave_requests").select("student_id, start_date, end_date").eq("id", id).maybeSingle();
  const { error } = await supabase.from("leave_requests").update({ status, reviewed_by: me.id }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAuditEvent(me.id, `${status}_leave_request`, "leave_requests", id);

  // The student and their parents are told the decision (best-effort; never blocks the review).
  if (request) {
    const { data: links } = await createAdminClient().from("parent_students").select("parent_id").eq("student_id", request.student_id);
    const recipients = [request.student_id, ...(links ?? []).map((l) => l.parent_id)];
    await notifyUsers(recipients, {
      type: "leave",
      title: status === "approved" ? "Leave request approved" : "Leave request not approved",
      body: `Leave from ${request.start_date} to ${request.end_date} was ${status}.`,
      url: "/",
    }).catch(() => {});
  }
  revalidatePath("/admin/leave-requests");
}
