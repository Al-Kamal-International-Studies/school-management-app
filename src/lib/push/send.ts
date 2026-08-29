import "server-only";

import webpush, { WebPushError } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNativePushToUser } from "./sendNative";

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
 * Best-effort push send — fans out to BOTH audiences a single user might
 * have: Web Push (the free, standards-based VAPID protocol, for anyone
 * using this app in a browser) and native push (APNs/FCM, for anyone using
 * the installed Capacitor app — see sendNative.ts's own doc comment for why
 * that's a genuinely separate mechanism, not just a different payload
 * shape). A user can have both at once (e.g. checks the app in a browser
 * AND has it installed) and gets notified on each. Every existing call
 * site already using this function picks up native delivery automatically,
 * with zero changes needed there — this is the one place that fan-out
 * happens. Silently does nothing for whichever half isn't configured/
 * subscribed, so callers never need to guard for either themselves. Prunes
 * subscriptions/tokens each provider reports as gone.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  await Promise.allSettled([sendWebPushToUser(userId, payload), sendNativePushToUser(userId, payload)]);
}

async function sendWebPushToUser(userId: string, payload: PushPayload): Promise<void> {
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
