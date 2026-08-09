"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const leaveSchema = z
  .object({
    reason: z.string().min(1, "Reason is required."),
    start_date: z.string().min(1, "Start date is required."),
    end_date: z.string().min(1, "End date is required."),
  })
  .refine((d) => d.end_date >= d.start_date, { message: "End date must be on or after the start date.", path: ["end_date"] });

export async function submitLeaveRequestAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("student");
  const parsed = leaveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase.from("leave_requests").insert({ ...parsed.data, student_id: me.id });
  if (error) return { error: error.message };

  revalidatePath("/student/leave");
  return { success: true };
}
