import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the auth session via Next's cookies() API, and
 * still uses the anon key — RLS enforces access based on the logged-in user.
 *
 * `cookies()` is async as of Next.js 15+, so this must be awaited too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component during render — safe to ignore
            // because middleware refreshes the session on every request.
          }
        },
      },
    }
  );
}
