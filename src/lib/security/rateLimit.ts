import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitCheck {
  limited: boolean;
}

/**
 * Minimal fixed-window rate limiter backed by the rate_limit_events table
 * (migration 0018_rate_limiting.sql). No third-party service — see that
 * migration's comment for why. Not a high-throughput production rate
 * limiter (a real one would use a sliding window / token bucket in
 * something like Redis) — this is deliberately simple and proportionate to
 * a single free-tier Supabase project's actual traffic.
 *
 * Usage pattern: check first, and only call recordAttempt() for the
 * events that should actually count (e.g. login records only on a
 * *failed* attempt, so a legitimate user typing their password right
 * every time never gets close to the limit).
 */
export async function checkRateLimit(
  bucket: string,
  opts: { maxAttempts: number; windowSeconds: number }
): Promise<RateLimitCheck> {
  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - opts.windowSeconds * 1000).toISOString();

  const { count, error } = await admin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .gte("created_at", windowStart);

  if (error) {
    // Fail open, not closed — a rate-limit outage should never be able to
    // lock every user out of logging in. Logged so it doesn't go unnoticed.
    console.error(`checkRateLimit(${bucket}) failed, failing open:`, error.message);
    return { limited: false };
  }

  return { limited: (count ?? 0) >= opts.maxAttempts };
}

export async function recordRateLimitAttempt(bucket: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("rate_limit_events").insert({ bucket });
  if (error) {
    console.error(`recordRateLimitAttempt(${bucket}) failed:`, error.message);
  }
}
