import type { ReactNode } from "react";

// Minimal shell for the mandatory post-temp-password change flow — no
// sidebar (the user isn't fully into the app yet), same pattern as
// src/app/mfa/layout.tsx and /forgot-password: each page imports AuthShell
// directly rather than a bespoke layout here.
export default function ForcePasswordChangeLayout({ children }: { children: ReactNode }) {
  return children;
}
