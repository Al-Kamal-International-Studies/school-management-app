"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const feedbackSchema = z.object({
  category: z.enum(["technical", "academic", "suggestion", "general"]),
  subject: z.string().min(1, "Subject is required.").max(200),
  message: z.string().min(1, "Message is required.").max(4000),
});

/**
 * Stored in-app only for now — no email/Google Sheet sync yet, that needs
 * credentials (a Google service-account + an email-sending API key) that
 * haven't been provided. See the admin Feedback inbox (/admin/feedback)
 * for the in-app view; wiring real delivery is a drop-in addition to this
 * action once those credentials exist.
 */
export async function submitFeedbackAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher", "student", "parent");

  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({ ...parsed.data, user_id: me.id });
  if (error) return { error: error.message };

  return { success: true };
}
