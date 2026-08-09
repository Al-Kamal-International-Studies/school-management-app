import { createClient } from "@/lib/supabase/server";
import type { ChatbotPersona } from "@/lib/types/database.types";

export async function listMyConversations(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chatbot_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getConversation(id: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("chatbot_conversations").select("*").eq("id", id).eq("user_id", userId).single();
  return data;
}

export async function getMessages(conversationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chatbot_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function countUserMessages(conversationId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("chatbot_messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("role", "user");
  return count ?? 0;
}

export type { ChatbotPersona };
