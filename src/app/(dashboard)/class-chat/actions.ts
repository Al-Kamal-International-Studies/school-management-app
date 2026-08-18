"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push/send";

export interface ActionState {
  error?: string;
}

const messageSchema = z.object({
  channel_id: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
});

export async function sendChannelMessageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentProfile();
  if (!me) return { error: "You must be signed in." };

  const parsed = messageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid message." };

  const supabase = await createClient();

  const { data: channel } = await supabase
    .from("class_subject_teachers")
    .select("*")
    .eq("id", parsed.data.channel_id)
    .single();
  if (!channel) return { error: "Chat not found." };

  const isTeacher = channel.teacher_id === me.id;
  let isStudentMember = false;
  if (!isTeacher && me.role === "student") {
    const { data: student } = await supabase.from("students").select("class_id").eq("id", me.id).single();
    isStudentMember = student?.class_id === channel.class_id;
  }
  if (!isTeacher && !isStudentMember) return { error: "You don't have access to this chat." };

  const { error } = await supabase
    .from("subject_chat_messages")
    .insert({ channel_id: parsed.data.channel_id, sender_id: me.id, content: parsed.data.content });
  if (error) return { error: error.message };

  // Best-effort push, teacher posts only — a student replying to classmates
  // shouldn't buzz everyone's phone, but "the teacher just posted" (e.g. a
  // meeting link for a class starting now) is exactly the case worth
  // interrupting for. Mirrors the audience-push pattern in
  // admin/announcements/actions.ts.
  if (isTeacher) {
    const [{ data: students }, { data: subject }] = await Promise.all([
      supabase.from("students").select("id").eq("class_id", channel.class_id),
      supabase.from("subjects").select("name").eq("id", channel.subject_id).single(),
    ]);
    const studentIds = (students ?? []).map((s) => s.id);
    if (studentIds.length) {
      await sendPushToUsers(studentIds, {
        title: `New message in ${subject?.name ?? "class"}`,
        body: parsed.data.content.slice(0, 120),
        url: `/class-chat/${parsed.data.channel_id}`,
      });
    }
  }

  revalidatePath(`/class-chat/${parsed.data.channel_id}`);
  revalidatePath("/class-chat");
  return {};
}
