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
    student_id: z.string().uuid(),
    reason: z.string().min(1, "Reason is required."),
    start_date: z.string().min(1, "Start date is required."),
    end_date: z.string().min(1, "End date is required."),
  })
  .refine((d) => d.end_date >= d.start_date, { message: "End date must be on or after the start date.", path: ["end_date"] });

/** Submits a leave request on behalf of a linked child. RLS (is_parent_of) rejects any other student_id. */
export async function submitChildLeaveRequestAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("parent");
  const parsed = leaveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase.from("leave_requests").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/parent");
  return { success: true };
}
