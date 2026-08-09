"use server";

import { getCurrentProfile } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/log";

/**
 * Thin Server Action wrappers so client components (which drive the actual
 * Supabase MFA enroll/verify/unenroll calls — see docs/SECURITY.md Phase 2)
 * can still record an audit trail entry, since lib/audit/log.ts is
 * server-only. The MFA state change itself already happened client-side by
 * the time these are called; this only ever adds a log line.
 */
export async function logMfaEnrolledAction() {
  const me = await getCurrentProfile();
  if (!me) return;
  await logAuditEvent(me.id, "mfa_enrolled", "profiles", me.id);
}

export async function logMfaUnenrolledAction() {
  const me = await getCurrentProfile();
  if (!me) return;
  await logAuditEvent(me.id, "mfa_unenrolled", "profiles", me.id);
}
