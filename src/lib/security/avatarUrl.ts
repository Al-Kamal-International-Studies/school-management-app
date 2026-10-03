/**
 * The only place a profile avatar is ever allowed to come from: the public
 * "avatars" bucket of THIS app's own Supabase project (where AvatarUpload /
 * IdCardPhotoUpload put it). `profiles.avatar_url` is a free-text column a
 * user can write to directly (RLS lets a user edit their own avatar), so any
 * code that DEREFERENCES it must check it first — most importantly the ID
 * card generator, which fetches it server-side (an unvalidated URL there is
 * an SSRF: the server could be pointed at an internal/arbitrary host, found
 * in the 2026-10-02 audit, HANDOVER Part 33). Also keeps third-party
 * tracking-pixel URLs out of the avatars other users' browsers load.
 *
 * Deliberately has no "server-only" import so both the server action that
 * saves the URL and client components can share it.
 */
export function isTrustedAvatarUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const candidate = new URL(url);
    const trusted = new URL(base);
    return (
      candidate.origin === trusted.origin &&
      candidate.pathname.startsWith("/storage/v1/object/public/avatars/") &&
      !candidate.pathname.includes("..")
    );
  } catch {
    return false;
  }
}
