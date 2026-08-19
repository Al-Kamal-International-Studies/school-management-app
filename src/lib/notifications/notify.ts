import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser, sendPushToUsers } from "@/lib/push/send";

export interface NotifyPayload {
  /** Free-form category, used for the bell dropdown's icon — "message",
   * "class_chat", "announcement", "assignment", "exam", etc. Not an enum:
   * new producers can invent their own type without a migration. */
  type: string;
  title: string;
  body: string;
  /** Where clicking the notification navigates — the specific chat, exam,
   * homework, class link, etc. it's actually about. Omit only when there's
   * genuinely nowhere more specific to send the user than their dashboard. */
  url?: string;
}

/**
 * The single choke point for "notify this person" across the whole app —
 * writes a row to the `notifications` table (the Topbar bell's inbox,
 * 0032_tour_versioning_and_notifications.sql) AND sends a push notification
 * via the existing Web Push infra (lib/push/send.ts), so every caller gets
 * both channels for free instead of remembering to wire each separately.
 * Every existing push call site in this app was migrated to call this
 * instead of `sendPushToUser(s)` directly (see git history / HANDOVER.md
 * Part 9) — any *new* producer should do the same rather than reaching for
 * `sendPushToUser(s)` on its own, or its event silently won't show up in
 * the bell.
 *
 * Uses the service-role admin client for the insert, not the caller's own
 * RLS-scoped client — the whole point is notifying *other* users (a
 * teacher notifying their students, an admin notifying an audience), and
 * `notifications` deliberately has no insert policy (see that migration's
 * header comment) — same trusted-server-code-only pattern already used for
 * push_subscriptions reads in lib/push/send.ts.
 */
export async function notifyUser(userId: string, payload: NotifyPayload): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({ user_id: userId, type: payload.type, title: payload.title, body: payload.body, url: payload.url });
  await sendPushToUser(userId, { title: payload.title, body: payload.body, url: payload.url });
}

export async function notifyUsers(userIds: string[], payload: NotifyPayload): Promise<void> {
  if (userIds.length === 0) return;
  const admin = createAdminClient();
  await admin
    .from("notifications")
    .insert(userIds.map((user_id) => ({ user_id, type: payload.type, title: payload.title, body: payload.body, url: payload.url })));
  await sendPushToUsers(userIds, { title: payload.title, body: payload.body, url: payload.url });
}
