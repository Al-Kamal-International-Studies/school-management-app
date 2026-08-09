import "server-only";

import webpush, { WebPushError } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

let configured = false;
function ensureConfigured() {
  if (configured || !VAPID_PUBLIC || !VAPID_PRIVATE) return;
  webpush.setVapidDetails("mailto:info@alkamalinternational.com", VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Best-effort push send — uses the free, standards-based Web Push protocol
 * (VAPID), not a paid third-party push service. Silently does nothing if
 * VAPID keys aren't configured, or if the user has no subscriptions, so
 * callers never need to guard for that themselves. Prunes subscriptions the
 * push service reports as gone (404/410).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  ensureConfigured();

  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs || subs.length === 0) return;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)));
}
