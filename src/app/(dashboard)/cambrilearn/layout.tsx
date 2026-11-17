import { requireRole } from "@/lib/auth";

export default async function CambriLearnLayout({ children }: { children: React.ReactNode }) {
  // CambriLearn is the students' external portal; staff open it too.
  // Parents are not offered it (HANDOVER Part 63).
  await requireRole("admin", "teacher", "student");
  return <>{children}</>;
}
