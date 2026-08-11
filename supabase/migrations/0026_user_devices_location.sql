-- Approximate per-device location (e.g. "Toronto, CA"), best-effort from
-- Vercel's built-in geo headers (x-vercel-ip-city / -country-region /
-- -country) at the moment a device is registered or re-seen — not a
-- third-party geolocation API, no new account, zero added cost. Null on
-- localhost/non-Vercel hosting, where those headers simply don't exist —
-- the UI falls back to an "unknown location" label in that case.
alter table public.user_devices
  add column if not exists location text;
