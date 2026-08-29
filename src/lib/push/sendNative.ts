import "server-only";

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PushPayload } from "./send";

/**
 * Sends to the native (Capacitor/APNs/FCM) audience — the other half of
 * sendPushToUser(s) in send.ts, which only ever reaches Web Push
 * subscribers (see 0041_native_push_tokens.sql's header comment for why
 * these are two separate tables/paths). Uses Firebase Cloud Messaging's
 * HTTP v1 API for BOTH Android and iOS — FCM can deliver to APNs on Apple's
 * behalf once an APNs Auth Key is uploaded to the Firebase project, so this
 * is the one unified send path rather than raw APNs + raw FCM separately.
 *
 * Same "durable env-var gate, no-op until configured, no new heavy SDK"
 * shape as sendEmail()'s own Resend integration (src/lib/email/send.ts) —
 * no `firebase-admin` dependency; the OAuth2 service-account bearer flow
 * (JWT signed with the service account's private key, exchanged for a
 * short-lived access token, then a plain authenticated POST to FCM) is
 * small enough to implement directly with Node's built-in `crypto` and
 * `fetch`, matching this project's established "no dependency for what a
 * few dozen lines of stdlib already does" convention.
 *
 * NOT CONFIGURED as of this writing (2026-08-26) — no Firebase project
 * exists for this app yet. See HANDOVER.md's App Store plan (step 3) for
 * exactly what Muhammad needs to do to turn this on: create a Firebase
 * project (free), add the Android app (google-services.json) and iOS app
 * (GoogleService-Info.plist, plus uploading an APNs Auth Key from the
 * Apple Developer account once that exists), download a service account
 * JSON from Project Settings -> Service Accounts, and set
 * FIREBASE_SERVICE_ACCOUNT_JSON (the whole JSON file, as one env var
 * string) as an environment variable. Nothing else in this file needs to
 * change once that's done.
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

function base64url(input: Buffer | string): string {
  return (Buffer.isBuffer(input) ? input : Buffer.from(input)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Exchanges the service account's private key for a short-lived FCM-scoped
 * OAuth2 access token via the standard JWT-bearer grant (RFC 7523) — the
 * same flow the `firebase-admin`/`google-auth-library` packages perform
 * internally, done here directly since it's a genuinely small amount of
 * code for one specific, narrow use. Not cached across invocations (each
 * serverless function invocation is short-lived anyway; a real
 * high-volume deployment could add a short in-memory cache here later if
 * token-exchange latency ever actually matters). */
async function getAccessToken(account: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), account.private_key);
  const jwt = `${unsigned}.${base64url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/** Best-effort, same philosophy as sendPushToUser — silently does nothing
 * if Firebase isn't configured or the user has no native tokens, so every
 * call site (sendPushToUser(s) in send.ts) never needs to guard for that
 * itself. Prunes tokens FCM reports as invalid/unregistered, the native
 * equivalent of send.ts's 404/410 pruning for Web Push. */
export async function sendNativePushToUser(userId: string, payload: PushPayload): Promise<void> {
  const account = loadServiceAccount();
  if (!account) return;

  const admin = createAdminClient();
  const { data: tokens } = await admin.from("native_push_tokens").select("*").eq("user_id", userId);
  if (!tokens || tokens.length === 0) return;

  const accessToken = await getAccessToken(account);
  if (!accessToken) return;

  await Promise.allSettled(
    tokens.map(async (row) => {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: { title: payload.title, body: payload.body },
            data: payload.url ? { url: payload.url } : undefined,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const errorCode = body?.error?.status;
        if (errorCode === "NOT_FOUND" || errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT") {
          await admin.from("native_push_tokens").delete().eq("id", row.id);
        }
      }
    })
  );
}

export async function sendNativePushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(userIds.map((id) => sendNativePushToUser(id, payload)));
}
