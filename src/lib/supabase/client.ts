"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database.types";

/**
 * Supabase client for use in Client Components. Uses the public anon key,
 * so it is safe to call from the browser — RLS policies enforce access.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
