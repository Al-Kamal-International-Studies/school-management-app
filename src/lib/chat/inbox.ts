import type { Contact, InboxItem } from "./types";

const at = (iso: string | null) => (iso ? Date.parse(iso) : 0);

/** Newest message first; chats with no messages sink below, alphabetically (spec §4.4). */
export const byRecency = (a: InboxItem, b: InboxItem) => at(b.lastMessageAt) - at(a.lastMessageAt) || a.title.localeCompare(b.title);

/**
 * Combines inbox snapshots newest-wins per chat: the one with the later last
 * message is kept; on a tie, the lower unread count (a read can only lower it)
 * and the sender's name if the local copy could not resolve it.
 */
export function mergeInbox(current: InboxItem[], incoming: InboxItem[]): InboxItem[] {
  const byId = new Map(current.map((c) => [c.id, c]));
  for (const next of incoming) {
    const have = byId.get(next.id);
    if (!have || at(next.lastMessageAt) > at(have.lastMessageAt)) byId.set(next.id, next);
    else if (at(next.lastMessageAt) === at(have.lastMessageAt))
      byId.set(next.id, {
        ...have,
        unread: Math.min(have.unread, next.unread),
        lastSenderName: have.lastSenderName ?? (next.lastSenderId === have.lastSenderId ? next.lastSenderName : null),
      });
  }
  return [...byId.values()].sort(byRecency);
}

export type LiveMessage = { chat_id: string; sender_id: string; content: string; created_at: string };

/** The sender's name from what is already known: same sender as the preview, another chat's latest from them, or a contact. */
function knownSenderName(inbox: InboxItem[], contacts: Contact[], item: InboxItem, senderId: string): string | null {
  if (senderId === item.lastSenderId) return item.lastSenderName;
  return (
    inbox.find((c) => c.lastSenderId === senderId && c.lastSenderName)?.lastSenderName ?? contacts.find((c) => c.id === senderId)?.fullName ?? null
  );
}

/** True when a group message from someone else has a sender whose name is not known locally. */
export function needsSenderLookup(inbox: InboxItem[], contacts: Contact[], m: LiveMessage, meId: string): boolean {
  const item = inbox.find((c) => c.id === m.chat_id);
  return !!item && item.kind === "group" && m.sender_id !== meId && !knownSenderName(inbox, contacts, item, m.sender_id);
}

/** Pure: the inbox after a live message arrives (moves its chat to the top, previews it, counts unread). */
export function applyMessage(prev: InboxItem[], contacts: Contact[], m: LiveMessage, meId: string, activeChatId: string | null): InboxItem[] {
  const item = prev.find((c) => c.id === m.chat_id);
  if (!item) return prev;
  const counts = m.sender_id !== meId && m.chat_id !== activeChatId;
  const updated: InboxItem = {
    ...item,
    lastMessageAt: m.created_at,
    preview: m.content,
    previewHidden: false,
    lastSenderId: m.sender_id,
    lastSenderName: knownSenderName(prev, contacts, item, m.sender_id),
    unread: counts ? item.unread + 1 : item.unread,
  };
  return [updated, ...prev.filter((c) => c.id !== m.chat_id)];
}
