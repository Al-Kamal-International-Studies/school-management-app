// Live-inbox logic (src/lib/chat/inbox.ts): a group message from a sender nobody
// has cached needs exactly one lookup, the state updater stays pure when replayed,
// and the equal-timestamp snapshot fills in the sender's name.
//   node scripts/inbox-live.test.ts
import { applyMessage, mergeInbox, needsSenderLookup } from "../src/lib/chat/inbox.ts";
import type { Contact, InboxItem } from "../src/lib/chat/types.ts";

let fail = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};

const group = (o: Partial<InboxItem> = {}): InboxItem => ({
  id: "g1", kind: "group", title: "Class 7A", subtitle: null, avatarUrl: null, otherId: null, otherRole: null,
  lastMessageAt: "2026-11-12T08:00:00Z", preview: "old", previewHidden: false, lastSenderId: "u-old", lastSenderName: "Old Sender", unread: 0, ...o,
});
const contacts: Contact[] = [{ id: "c1", fullName: "Known Contact", role: "teacher", avatarUrl: null, context: null }];
const msg = (sender: string) => ({ chat_id: "g1", sender_id: sender, content: "hi", created_at: "2026-11-12T09:00:00Z" });

const inbox = [group()];

// lookup decision
check("uncached group sender needs a lookup", needsSenderLookup(inbox, contacts, msg("stranger"), "me"));
check("contact sender needs no lookup", !needsSenderLookup(inbox, contacts, msg("c1"), "me"));
check("same sender as preview needs no lookup", !needsSenderLookup(inbox, contacts, msg("u-old"), "me"));
check("my own message needs no lookup", !needsSenderLookup(inbox, contacts, msg("me"), "me"));
check("direct chat needs no lookup", !needsSenderLookup([group({ kind: "direct" })], contacts, msg("stranger"), "me"));
check("name known from another chat needs no lookup", !needsSenderLookup([group(), group({ id: "g2", lastSenderId: "stranger", lastSenderName: "Stranger S" })], contacts, msg("stranger"), "me"));

// the updater is pure: replaying it (React may) gives equal results and leaves its input alone
const snapshot = JSON.stringify(inbox);
const a = applyMessage(inbox, contacts, msg("stranger"), "me", null);
const b = applyMessage(inbox, contacts, msg("stranger"), "me", null);
check("updater is replay-safe (same result twice)", JSON.stringify(a) === JSON.stringify(b));
check("updater does not mutate its input", JSON.stringify(inbox) === snapshot);
check("message moves to the top with sender id and no name yet", a[0]!.lastSenderId === "stranger" && a[0]!.lastSenderName === null && a[0]!.unread === 1);

// lookups fired by the handler: one per message, regardless of how often the updater runs
let lookups = 0;
const handle = (m: ReturnType<typeof msg>) => {
  if (needsSenderLookup(inbox, contacts, m, "me")) lookups++;
  applyMessage(inbox, contacts, m, "me", null);
  applyMessage(inbox, contacts, m, "me", null); // simulated replay
};
handle(msg("stranger"));
check("one uncached message triggers exactly one lookup despite updater replay", lookups === 1);

// the lookup resolves with the same timestamp: the name appears, local unread kept
const fresh = [group({ lastMessageAt: "2026-11-12T09:00:00Z", preview: "hi", lastSenderId: "stranger", lastSenderName: "Stranger S", unread: 1 })];
const merged = mergeInbox(a, fresh);
check("name appears when the lookup resolves", merged[0]!.lastSenderName === "Stranger S");
check("merge keeps local preview/unread on a tie", merged[0]!.unread === 1 && merged[0]!.preview === "hi");
check("merge does not borrow a name for a different sender", mergeInbox(a, [group({ lastMessageAt: "2026-11-12T09:00:00Z", lastSenderId: "other", lastSenderName: "Other" })])[0]!.lastSenderName === null);
check("merge keeps an existing name on a tie", mergeInbox([group()], [group({ lastSenderName: "Changed" })])[0]!.lastSenderName === "Old Sender");

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
