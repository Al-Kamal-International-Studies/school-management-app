import Link from "next/link";
import { GraduationCap, Users, School, UserPlus, BookMarked, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  // Counted via `profiles` (role + archived_at is null) rather than the
  // students/teachers extension tables, so archived accounts — which stay
  // in the database for audit purposes but are excluded from active lists
  // — don't inflate these numbers.
  const [{ count: studentCount }, { count: teacherCount }, { count: classCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student").is("archived_at", null),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher").is("archived_at", null),
    supabase.from("classes").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">Overview</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-navy-400">A snapshot of your school.</p>
      </FadeUp>

      <FadeUpStagger className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <FadeUpItem>
          <StatCard label="Total students" value={studentCount ?? 0} icon={GraduationCap} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label="Total teachers" value={teacherCount ?? 0} icon={Users} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label="Classes" value={classCount ?? 0} icon={School} />
        </FadeUpItem>
      </FadeUpStagger>

      <FadeUp delay={0.15}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-navy-100">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/users/new">
            <Button>
              <UserPlus className="h-4 w-4" />
              Add student or teacher
            </Button>
          </Link>
          <Link href="/admin/classes/new">
            <Button variant="secondary">
              <School className="h-4 w-4" />
              Create a class
            </Button>
          </Link>
          <Link href="/admin/subjects">
            <Button variant="secondary">
              <BookMarked className="h-4 w-4" />
              Manage subjects
            </Button>
          </Link>
          <Link href="/admin/timetable">
            <Button variant="secondary">
              <CalendarClock className="h-4 w-4" />
              Build timetable
            </Button>
          </Link>
        </div>
      </FadeUp>
    </div>
  );
}
