import { requireSession } from "@/lib/auth";
import { listContacts, listInbox } from "@/lib/chat/queries";
import { MessagesShell } from "@/components/chat/MessagesShell";

/**
 * WhatsApp-style two-pane Messages (HANDOVER Part 42). The layout owns the
 * left pane (contacts row + chat list) so it stays mounted — and live — while
 * the user moves between chats; the page on the right is the open chat.
 */
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const me = await requireSession();
  const [inbox, contacts] = await Promise.all([listInbox(), listContacts(me.role)]);

  return (
    <MessagesShell me={{ id: me.id, role: me.role }} initialInbox={inbox} contacts={contacts}>
      {children}
    </MessagesShell>
  );
}
