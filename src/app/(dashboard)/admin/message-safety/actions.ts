"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** An admin's verdict on a filtered message — also the label used to retrain the filter (ml/README.md). */
export async function setFlagVerdictAction(flagId: string, verdict: "harmful" | "ok"): Promise<void> {
  const me = await requireRole("admin");
  if (!z.guid().safeParse(flagId).success || (verdict !== "harmful" && verdict !== "ok")) return;
  const supabase = await createClient();
  // RLS: admins only
  await supabase.from("message_flags").update({ verdict, reviewed_at: new Date().toISOString(), reviewed_by: me.id }).eq("id", flagId);
  revalidatePath("/admin/message-safety");
}
