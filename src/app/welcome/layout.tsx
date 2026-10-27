import type { ReactNode } from "react";
import { AuthBackground } from "@/components/auth/AuthBackground";

// Shared visual shell for the mandatory first-launch language screen and the
// splash screen that follows it — the same brand surface as the sign-in
// branding panel (quiet vertical navy-gradient + the crest's star lattice
// fading out from the top), just full-width since there's no form beside it.
export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-navy-gradient px-4 py-12 sm:px-6">
      <AuthBackground patternId="welcome-star-lattice" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
