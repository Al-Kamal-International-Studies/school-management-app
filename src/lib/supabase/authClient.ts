import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";

/**
 * Like lib/supabase/server.ts's createClient(), but for the one moment that
 * actually establishes a new session (password sign-in, or the WebAuthn
 * login bridge) — lets the caller control whether the resulting cookies
 * persist across browser restarts ("Remember me").
 *
 * @supabase/ssr's own default cookie options (checked directly against
 * node_modules/@supabase/ssr/dist/main/utils/constants.js) set a 400-day
 * maxAge unconditionally — there's no built-in "session cookie" mode. When
 * `remember` is false, this strips maxAge/expires from every cookie the
 * Supabase client tries to set, so the browser treats them as session
 * cookies (cleared when it fully closes) instead. Every other option
 * (path, sameSite, httpOnly) is passed through unchanged from whatever the
 * library itself provided, so this never drifts from upstream behavior —
 * it only ever removes two specific keys.
 */
export async function createAuthClient(remember: boolean) {
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
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions: CookieOptions = { ...options };
            if (!remember) {
              delete finalOptions.maxAge;
              delete finalOptions.expires;
            }
            cookieStore.set(name, value, finalOptions);
          });
        },
      },
    }
  );
}
