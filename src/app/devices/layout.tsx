import type { ReactNode } from "react";

// Minimal shell, same pattern as /mfa and /force-password-change — reached
// via requireRole()'s device-approval gate, so it deliberately can't call
// requireRole() on itself (infinite redirect loop).
export default function DevicesLayout({ children }: { children: ReactNode }) {
  return children;
}
