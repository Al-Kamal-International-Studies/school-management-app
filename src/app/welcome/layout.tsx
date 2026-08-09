import type { ReactNode } from "react";

// Shared visual shell for the mandatory first-launch language screen and the
// splash screen that follows it — same navy-gradient/dot-grid brand surface
// as the login page's AuthShell branding panel, just full-width and simpler
// since there's no form to sit beside.
export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-gradient p-6">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-navy-400/20 blur-3xl" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
