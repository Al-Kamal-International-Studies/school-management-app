-- ----------------------------------------------------------------------------
-- 0041_native_push_tokens.sql
--
-- Step 3 of the App Store plan (HANDOVER.md) — native push notifications.
-- The existing push_subscriptions table (0012_communication.sql) is
-- standards-based Web Push (VAPID: endpoint + p256dh + auth keys), which
-- works in a real browser but NOT inside Capacitor's native WebView shell —
-- iOS's WKWebView has no Push API at all, and Android's WebView-hosted
-- service worker can't reliably wake on push once the app process is
-- killed. Native push requires the platform's own path instead:
-- @capacitor/push-notifications registers the device directly with
-- APNs (iOS) / FCM (Android) and hands back a device token — a
-- fundamentally different shape (one opaque token string, not a
-- three-part Web Push subscription), hence a separate table rather than
-- overloading push_subscriptions with nullable native-only columns.
--
-- A genuinely NEW subscription table, not a rename/migration of the old
-- one — a user may legitimately have both a web subscription (using the
-- app in a browser) and a native token (using the installed app) at the
-- same time, and both should receive notifications.
-- ----------------------------------------------------------------------------

create table native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  token text not null,
  created_at timestamptz not null default now(),
  unique (platform, token)
);

create index idx_native_push_tokens_user_id on native_push_tokens(user_id);

alter table native_push_tokens enable row level security;

create policy "users can view their own native push tokens"
  on native_push_tokens for select to authenticated using (user_id = auth.uid());
create policy "users can register their own native push token"
  on native_push_tokens for insert to authenticated with check (user_id = auth.uid());
create policy "users can remove their own native push token"
  on native_push_tokens for delete to authenticated using (user_id = auth.uid());

comment on table native_push_tokens is 'APNs/FCM device tokens for the native (Capacitor) app shell, separate from push_subscriptions (Web Push, browser-only). See src/lib/push/sendNative.ts.';
