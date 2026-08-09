"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/log";
import type { LeaveStatus } from "@/lib/types/database.types";

export async function reviewLeaveRequestAction(id: string, status: Extract<LeaveStatus, "approved" | "rejected">) {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("leave_requests").update({ status, reviewed_by: me.id }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAuditEvent(me.id, `${status}_leave_request`, "leave_requests", id);
  revalidatePath("/admin/leave-requests");
}
