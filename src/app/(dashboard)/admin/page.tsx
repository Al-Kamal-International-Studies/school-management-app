import Link from "next/link";
import {
  GraduationCap,
  Users,
  School,
  UserPlus,
  BookMarked,
  CalendarClock,
  CalendarCheck,
  ClipboardList,
  MessageSquare,
  KeyRound,
  CalendarDays,
  Activity,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getOverviewCounts, getAttendanceTrend, listRecentActivity, listUpcomingEvents } from "./queries";
import type { EventType } from "@/lib/types/database.types";

// Same tone mapping as /admin/events and /calendar, for a consistent look
// across every place events appear in the app.
const EVENT_TYPE_TONE: Record<EventType, "navy" | "gold" | "red"> = { event: "navy", holiday: "gold", deadline: "red" };

export default async function AdminOverviewPage() {
  const dict = await getDictionary(await getLocale());

  const [counts, attendanceTrend, recentActivity, upcomingEvents] = await Promise.all([
    getOverviewCounts(),
    getAttendanceTrend(),
    listRecentActivity(6),
    listUpcomingEvents(5),
  ]);

  const needsAttentionTiles = [
    {
      key: "leave",
      href: "/admin/leave-requests",
      label: dict.adminOverview.pendingLeaveRequests,
      value: counts.pendingLeaveCount,
      icon: ClipboardList,
    },
    {
      key: "feedback",
      href: "/admin/feedback",
      label: dict.adminOverview.openFeedback,
      value: counts.openFeedbackCount,
      icon: MessageSquare,
    },
    {
      key: "resets",
      href: "/admin/password-reset-requests",
      label: dict.adminOverview.pendingPasswordResets,
      value: counts.pendingPasswordResetCount,
      icon: KeyRound,
    },
  ];

  return (
    <div className="space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.adminOverview.title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-navy-400">{dict.adminOverview.subtitle}</p>
      </FadeUp>

      <FadeUpStagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <FadeUpItem>
          <StatCard label={dict.adminOverview.totalStudents} value={counts.studentCount} icon={GraduationCap} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.adminOverview.totalTeachers} value={counts.teacherCount} icon={Users} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard label={dict.adminOverview.classes} value={counts.classCount} icon={School} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard
            label={dict.adminOverview.attendanceRate}
            value={attendanceTrend.thisWeekRate !== null ? `${attendanceTrend.thisWeekRate}%` : "—"}
            hint={dict.common.vsLastWeek}
            icon={CalendarCheck}
            delta={attendanceTrend.thisWeekRate !== null ? { value: attendanceTrend.delta, goodDirection: "up" } : undefined}
            trend={attendanceTrend.sparkline}
          />
        </FadeUpItem>
      </FadeUpStagger>

      <FadeUp delay={0.1} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.adminOverview.needsAttention}</h2>
        <FadeUpStagger className="grid grid-cols-1 gap-4 sm:grid-cols-3" staggerDelay={0.06}>
          {needsAttentionTiles.map((tile) => (
            <FadeUpItem key={tile.key}>
              <Link href={tile.href}>
                <StatCard
                  label={tile.label}
                  value={tile.value}
                  hint={tile.value > 0 ? dict.adminOverview.reviewNow : dict.adminOverview.nothingPending}
                  icon={tile.icon}
                />
              </Link>
            </FadeUpItem>
          ))}
        </FadeUpStagger>
      </FadeUp>

      <FadeUp delay={0.16} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-navy-100">
              <CalendarDays className="h-4 w-4" />
              {dict.adminOverview.upcomingEvents}
            </h2>
            <Link href="/admin/events" className="text-xs font-medium text-navy-700 hover:underline dark:text-navy-300">
              {dict.common.viewAll}
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500 dark:text-navy-400">{dict.adminOverview.noUpcomingEvents}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((e) => (
                <Card key={e.id} className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-navy-50 text-navy-900 dark:bg-navy-800 dark:text-white">
                    <span className="text-base font-bold leading-none">{new Date(`${e.event_date}T00:00:00`).getDate()}</span>
                    <span className="text-[9px] uppercase text-slate-500 dark:text-navy-400">
                      {new Date(`${e.event_date}T00:00:00`).toLocaleDateString(undefined, { month: "short" })}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900 dark:text-white">{e.title}</p>
                    <div className="mt-1">
                      <Badge tone={EVENT_TYPE_TONE[e.event_type]}>{e.event_type}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-navy-100">
              <Activity className="h-4 w-4" />
              {dict.adminOverview.recentActivity}
            </h2>
            <Link href="/admin/audit-log" className="text-xs font-medium text-navy-700 hover:underline dark:text-navy-300">
              {dict.common.viewAll}
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500 dark:text-navy-400">{dict.adminOverview.noRecentActivity}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <Card key={item.id} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900 dark:text-white">{item.actorName ?? dict.common.system}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-navy-400">{item.action}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </FadeUp>

      <FadeUp delay={0.22}>
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
