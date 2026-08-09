import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * Service-role Supabase client. Bypasses RLS entirely — NEVER import this
 * from a Client Component, and never send its results straight to the
 * client without checking the caller's own role first (see
 * lib/auth.ts#requireRole). Used only for privileged admin operations, e.g.
 * creating teacher/student accounts (self-registration is disabled per spec).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local (see .env.local.example)."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
