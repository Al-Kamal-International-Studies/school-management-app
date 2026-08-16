import type { ReactNode } from "react";

// Minimal shell, same pattern as /mfa, /force-password-change, and
// /devices/manage — reached via requireRole()'s passkey-prompt gate
// (lib/auth.ts), so it deliberately can't call requireRole() on itself
// (infinite redirect loop).
export default function SetupPasskeyLayout({ children }: { children: ReactNode }) {
  return children;
}
