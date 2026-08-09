import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Records an admin-action audit entry. Deliberately best-effort: a logging
 * failure should never block the actual action, so errors are swallowed
 * (not surfaced to the caller) rather than thrown.
 *
 * Uses the service-role client on purpose (see migration
 * 0016_authz_hardening.sql) — audit_logs has no authenticated-role INSERT
 * policy at all, so a regular RLS-scoped client would always be denied.
 * This makes the log tamper-resistant: no user session, including an
 * admin's own, can write a fabricated entry via a direct API call. Callers
 * still pass `actorId` explicitly (from the already-verified
 * `requireRole()` result), not derived from the client, so entries stay
 * accurately attributed.
 */
export async function logAuditEvent(
  actorId: string,
  action: string,
  targetTable?: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  try {
    const supabase = createAdminClient();
    await supabase.from("audit_logs").insert({
      actor_id: actorId,
      action,
      target_table: targetTable ?? null,
      target_id: targetId ?? null,
      details: details ?? null,
    });
  } catch {
    // Non-fatal — see doc comment above.
  }
}
