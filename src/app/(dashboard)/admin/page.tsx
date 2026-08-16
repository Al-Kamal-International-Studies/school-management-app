import Link from "next/link";
import { GraduationCap, Users, School, UserPlus, BookMarked, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const dict = await getDictionary(await getLocale());

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
        <h1 data-tour="page-title" className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.adminOverview.title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-navy-400">{dict.adminOverview.subtitle}</p>
      </FadeUp>

      <FadeUpStagger className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <FadeUpItem>
          <StatCard label={dict.adminOverview.totalStudents} value={studentCount ?? 0} icon={GraduationCap} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.adminOverview.totalTeachers} value={teacherCount ?? 0} icon={Users} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.adminOverview.classes} value={classCount ?? 0} icon={School} />
        </FadeUpItem>
      </FadeUpStagger>

      <FadeUp delay={0.15}>
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.adminOverview.quickActions}</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/users/new">
            <Button>
              <UserPlus className="h-4 w-4" />
              {dict.adminOverview.addStudentOrTeacher}
            </Button>
          </Link>
          <Link href="/admin/classes/new">
            <Button variant="secondary">
              <School className="h-4 w-4" />
              {dict.adminOverview.createClass}
            </Button>
          </Link>
          <Link href="/admin/subjects">
            <Button variant="secondary">
              <BookMarked className="h-4 w-4" />
              {dict.adminOverview.manageSubjects}
            </Button>
          </Link>
          <Link href="/admin/timetable">
            <Button variant="secondary">
              <CalendarClock className="h-4 w-4" />
              {dict.adminOverview.buildTimetable}
            </Button>
          </Link>
        </div>
      </FadeUp>
    </div>
  );
}
