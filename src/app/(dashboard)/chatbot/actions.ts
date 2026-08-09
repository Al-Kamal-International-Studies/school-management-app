"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFaqAnswer, type ChatRole } from "@/lib/chatbot/faq";
import { getGreeting } from "@/lib/chatbot/personas";
import { CHATBOT_MESSAGE_LIMIT } from "@/lib/chatbot/constants";

export interface ActionState {
  error?: string;
  reply?: string;
}

const personaSchema = z.enum(["muhammad", "sheikha"]);

function isChatRole(role: string): role is ChatRole {
  return role === "teacher" || role === "student" || role === "parent";
}

/** Starts a brand-new conversation with the given persona and jumps to it. */
export async function startConversationAction(formData: FormData) {
  const me = await getCurrentProfile();
  if (!me || !isChatRole(me.role)) {
    redirect("/login");
  }

  const parsed = personaSchema.safeParse(formData.get("persona"));
  if (!parsed.success) redirect("/chatbot");

  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from("chatbot_conversations")
    .insert({ user_id: me!.id, persona: parsed.data })
    .select()
    .single();

  if (error || !conversation) redirect("/chatbot");

  await supabase.from("chatbot_messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: getGreeting(parsed.data, me!.role as ChatRole),
  });

  redirect(`/chatbot/${conversation.id}`);
}

const sendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().trim().min(1).max(500),
});

export async function sendMessageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const parsed = sendMessageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid message." };

  const supabase = await createClient();

  // Confirm this conversation belongs to the caller before doing anything else.
  const { data: conversation } = await supabase
    .from("chatbot_conversations")
    .select("id, user_id")
    .eq("id", parsed.data.conversation_id)
    .eq("user_id", me.id)
    .single();
  if (!conversation) return { error: "Conversation not found." };

  const { count: userMessageCount } = await supabase
    .from("chatbot_messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversation.id)
    .eq("role", "user");

  if ((userMessageCount ?? 0) >= CHATBOT_MESSAGE_LIMIT) {
    return { error: "This conversation has reached its message limit. Start a new conversation to keep chatting." };
  }

  const { error: insertError } = await supabase.from("chatbot_messages").insert({
    conversation_id: conversation.id,
    role: "user",
    content: parsed.data.content,
  });
  if (insertError) {
    return { error: "This conversation has reached its message limit. Start a new conversation to keep chatting." };
  }

  const reply = getFaqAnswer(parsed.data.content, isChatRole(me.role) ? me.role : "student");
  await supabase.from("chatbot_messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: reply,
  });
  await supabase.from("chatbot_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id);

  revalidatePath(`/chatbot/${conversation.id}`);
  revalidatePath("/chatbot");
  return { reply };
}
