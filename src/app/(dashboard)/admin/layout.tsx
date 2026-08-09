import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Redundant with the (dashboard) layout's login check, but this is the
  // actual role gate — a teacher or student hitting /admin/* by guessing
  // the URL is bounced to their own dashboard here, and RLS blocks any
  // data access even if this check were ever skipped.
  await requireRole("admin");
  return <>{children}</>;
}
