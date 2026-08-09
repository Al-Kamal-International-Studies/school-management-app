"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackStatus } from "@/lib/types/database.types";

export async function setFeedbackStatusAction(id: string, status: FeedbackStatus) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("feedback").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/feedback");
}
