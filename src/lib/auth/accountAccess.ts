import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bans (or un-bans) a user at the Supabase Auth level. Call this whenever an
 * account is deactivated/archived/reactivated, alongside the `profiles`
 * update — see admin/users/actions.ts.
 *
 * Why a ban and not a direct "kill this user's sessions" call: the
 * supabase-js Admin API's `signOut()` revokes a specific session given a
 * live JWT (checked directly against the installed
 * node_modules/@supabase/auth-js types — it takes `jwt: string`, not a user
 * id), and there is no separate "revoke every session for this user id"
 * method exposed. `updateUserById(uid, { ban_duration })` is the
 * documented, SDK-supported way to immediately stop an account from
 * signing in or refreshing its token again.
 *
 * Combined with migration 0016_authz_hardening.sql (auth_role()/is_admin()
 * now require is_active/archived_at, so every role-gated RLS policy denies
 * a deactivated account immediately) and requireRole() (checks is_active on
 * every page load, so all in-app navigation is cut off immediately), this
 * closes the practical gap.
 *
 * One honest limitation, not hidden: Supabase's access tokens are
 * short-lived and self-verified — PostgREST checks a token's signature and
 * expiry locally, it doesn't call back to Auth on every request. A
 * still-unexpired access token used directly against a *pure
 * ownership-based* policy (e.g. "students can view their own grades",
 * which checks `student_id = auth.uid()` and never consults
 * is_admin()/auth_role()) can keep working until that token's natural
 * expiry (project default under Authentication → Sessions in the Supabase
 * dashboard — commonly ~1 hour) even after the ban is applied, since the
 * ban blocks *new* sign-ins/refreshes, not already-issued tokens. Every
 * role-gated action and all in-app navigation are cut off immediately
 * regardless.
 */
export async function setAccountBanned(userId: string, banned: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) {
    // Best-effort, same philosophy as logAuditEvent: don't let a ban-sync
    // failure block the profiles-table update that's the primary source of
    // truth for is_active/archived_at. Surfaced via server logs only.
    console.error(`setAccountBanned(${userId}, ${banned}) failed:`, error.message);
  }
}
