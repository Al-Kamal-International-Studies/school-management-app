import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Records an admin-action audit entry. Deliberately best-effort: a logging
 * failure should never block the actual action, so errors are swallowed
 * (not surfaced to the caller) rather than thrown.
 *
 * Instrumented on the highest-risk actions — account creation,
 * activate/deactivate, archive, and leave-request review — not every
 * mutation in the app; extend this list as needed.
 */
export async function logAuditEvent(
  actorId: string,
  action: string,
  targetTable?: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  try {
    const supabase = await createClient();
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
