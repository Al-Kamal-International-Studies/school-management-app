"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/security/rateLimit";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const feedbackSchema = z.object({
  category: z.enum(["technical", "academic", "suggestion", "general"]),
  subject: z.string().min(1, "Subject is required.").max(200),
  message: z.string().min(1, "Message is required.").max(4000),
});

const FEEDBACK_MAX_ATTEMPTS = 10;
const FEEDBACK_WINDOW_SECONDS = 60 * 60;

/**
 * Stored in-app only for now — no email/Google Sheet sync yet, that needs
 * credentials (a Google service-account + an email-sending API key) that
 * haven't been provided. See the admin Feedback inbox (/admin/feedback)
 * for the in-app view; wiring real delivery is a drop-in addition to this
 * action once those credentials exist.
 */
export async function submitFeedbackAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("teacher", "student", "parent");

  const bucket = `feedback:${me.id}`;
  const { limited } = await checkRateLimit(bucket, { maxAttempts: FEEDBACK_MAX_ATTEMPTS, windowSeconds: FEEDBACK_WINDOW_SECONDS });
  if (limited) return { error: "You've submitted a lot of feedback recently — please wait a while before sending more." };

  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({ ...parsed.data, user_id: me.id });
  if (error) return { error: error.message };

  await recordRateLimitAttempt(bucket);
  return { success: true };
}
