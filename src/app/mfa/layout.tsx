import type { ReactNode } from "react";

// Minimal shell for the MFA setup/verify flow — no sidebar (the user isn't
// fully into the app yet), reuses the same auth-page visual language as
// /login via AuthShell (imported by each page directly, same as
// /reset-password does) rather than a bespoke layout here.
export default function MfaLayout({ children }: { children: ReactNode }) {
  return children;
}
