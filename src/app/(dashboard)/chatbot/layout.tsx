import { requireRole } from "@/lib/auth";

export default async function ChatbotLayout({ children }: { children: React.ReactNode }) {
  // The help chatbot is a teacher/student/parent support tool — admins
  // already know the system, so it's intentionally not offered to them.
  await requireRole("teacher", "student", "parent");
  return <>{children}</>;
}
