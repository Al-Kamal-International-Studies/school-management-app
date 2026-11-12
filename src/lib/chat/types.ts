import type { ChatKind, ChatReceipt, UserRole } from "@/lib/types/database.types";

export type ChatPerson = { id: string; full_name: string; role: UserRole; avatar_url: string | null };

/** sending = optimistic bubble (clock), sent = stored, failed = tap to retry */
export type MessageStatus = "sending" | "sent" | "failed";

export interface UiMessage {
  id: string;
  chatId: string;
  senderId: string;
  clientId: string;
  content: string;
  createdAt: string;
  /** hidden by the safety filter when shown */
  hidden?: boolean;
  status: MessageStatus;
  error?: string;
}

export interface InboxItem {
  id: string;
  kind: ChatKind;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  otherId: string | null;
  otherRole: UserRole | null;
  lastMessageAt: string | null;
  preview: string | null;
  previewHidden: boolean;
  lastSenderId: string | null;
  lastSenderName: string | null;
  unread: number;
}

export interface Contact {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  context: string | null;
}

export interface ChatDetail {
  id: string;
  kind: ChatKind;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  otherId: string | null;
  otherRole: UserRole | null;
  canSend: boolean;
  /** the overseer viewing someone else's private chat: read-only, no receipts */
  oversight: boolean;
  memberIds: string[];
  people: Record<string, ChatPerson>;
  messages: UiMessage[];
  hasMore: boolean;
  receipts: ChatReceipt[];
}

export type Tick = "pending" | "sent" | "delivered" | "read" | "failed";

/**
 * WhatsApp ticks for one of MY messages: read (blue ✓✓) once every other
 * member's read mark has passed it, delivered (grey ✓✓) once every other
 * member's device has it, otherwise sent (✓).
 */
export function tickFor(m: UiMessage, myId: string, memberIds: string[], receipts: Map<string, ChatReceipt>): Tick {
  if (m.status === "sending") return "pending";
  if (m.status === "failed") return "failed";
  const others = memberIds.filter((id) => id !== myId);
  if (others.length === 0) return "sent";
  // compare as instants: REST and Realtime format timestamps differently
  const t = Date.parse(m.createdAt);
  const all = (pick: (r: ChatReceipt) => string | null) =>
    others.every((id) => {
      const r = receipts.get(id);
      const v = r ? pick(r) : null;
      return !!v && Date.parse(v) >= t;
    });
  if (all((r) => r.read_up_to)) return "read";
  if (all((r) => r.delivered_up_to)) return "delivered";
  return "sent";
}
