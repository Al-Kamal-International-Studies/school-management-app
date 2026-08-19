"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications/notify";

export interface ActionState {
  error?: string;
}

/**
 * Finds or creates the conversation with `otherUserId`, then redirects to
 * it. RLS (can_message()) is the real gate on whether this pairing is
 * allowed — this just always inserts participant ids in a consistent order
 * so the same pair never produces two conversation rows.
 */
export async function startConversationAction(otherUserId: string) {
  const me = await getCurrentProfile();
  if (!me) redirect("/login");

  const sorted = [me!.id, otherUserId].sort();
  const a = sorted[0]!;
  const b = sorted[1]!;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("dm_conversations")
    .select("id")
    .eq("participant_a", a)
    .eq("participant_b", b)
    .maybeSingle();

  if (existing) redirect(`/messages/${existing.id}`);

  const { data: created, error } = await supabase
    .from("dm_conversations")
    .insert({ participant_a: a, participant_b: b })
    .select("id")
    .single();
  if (error || !created) redirect("/messages");

  redirect(`/messages/${created.id}`);
}

const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
});

export async function sendDmMessageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const parsed = messageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid message." };

  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("dm_conversations")
    .select("*")
    .eq("id", parsed.data.conversation_id)
    .single();
  if (!conversation || (conversation.participant_a !== me.id && conversation.participant_b !== me.id)) {
    return { error: "Conversation not found." };
  }

  const { error } = await supabase
    .from("dm_messages")
    .insert({ conversation_id: parsed.data.conversation_id, sender_id: me.id, content: parsed.data.content });
  if (error) return { error: error.message };

  await supabase.from("dm_conversations").update({ updated_at: new Date().toISOString() }).eq("id", parsed.data.conversation_id);

  const recipientId = conversation.participant_a === me.id ? conversation.participant_b : conversation.participant_a;
  await notifyUser(recipientId, {
    type: "message",
    title: `New message from ${me.full_name}`,
    body: parsed.data.content.slice(0, 120),
    url: `/messages/${parsed.data.conversation_id}`,
  });

  revalidatePath(`/messages/${parsed.data.conversation_id}`);
  return {};
}
