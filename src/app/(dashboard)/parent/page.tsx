import { Megaphone } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { listMyChildren, getChildOverview } from "./queries";
import { listVisibleAnnouncements } from "@/lib/queries/announcements";
import { ChildLeaveForm } from "./ChildLeaveForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/Table";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/motion/FadeUp";
import { formatMonth } from "@/lib/progress/calculate";
import { initials } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { AttendanceStatus, LeaveStatus } from "@/lib/types/database.types";

const ATTENDANCE_TONE: Record<AttendanceStatus, "green" | "red" | "amber" | "slate"> = {
  present: "green",
  absent: "red",
  late: "amber",
  excused: "slate",
};
const LEAVE_TONE: Record<LeaveStatus, "amber" | "green" | "red"> = { pending: "amber", approved: "green", rejected: "red" };

export default async function ParentDashboardPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const me = await getCurrentProfile();
  const dict = await getDictionary(await getLocale());
  if (!me) return null;

  const children = await listMyChildren(me.id);
  const { child: childParam } = await searchParams;
  const activeChild = children.find((c) => c.id === childParam) ?? children[0];

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-xl">
        <FadeUp>
          <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.parent.title}</h1>
        </FadeUp>
        <FadeUp delay={0.05} className="mt-4">
          <Alert tone="info">{dict.parent.noChildren}</Alert>
        </FadeUp>
      </div>
    );
  }

  const [overview, announcements] = await Promise.all([getChildOverview(activeChild.id), listVisibleAnnouncements(5)]);
  const presentCount = overview.attendance.filter((a) => a.status === "present").length;
  const attendanceRate = overview.attendance.length ? Math.round((presentCount / overview.attendance.length) * 1000) / 10 : null;

  return (
    <div className="space-y-8">
      <FadeUp className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 data-tour="page-title" className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{activeChild.full_name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">
            {activeChild.className ?? dict.common.notAssigned} · #{activeChild.enrollment_number}
          </p>
        </div>
        {children.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {children.map((c) => (
              <a
                key={c.id}
                href={`/parent?child=${c.id}`}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  c.id === activeChild.id
                    ? "bg-navy-800 text-white dark:bg-navy-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                  {initials(c.full_name)}
                </span>
                {c.full_name}
              </a>
            ))}
          </div>
        )}
      </FadeUp>

      <FadeUpStagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" staggerDelay={0.06}>
        <FadeUpItem>
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.progress.academicProgress}</h2>
            {overview.overallScore !== null ? (
              <div className="flex items-center gap-5">
                <ProgressRing value={overview.overallScore} label={dict.progress.overallScore} />
                {overview.latestMonth && <p className="text-xs text-slate-500 dark:text-navy-400">{formatMonth(overview.latestMonth)}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-navy-400">{dict.progress.noProgressYetDescription}</p>
            )}
          </Card>
        </FadeUpItem>
        <FadeUpItem>
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.attendance.title}</h2>
            {attendanceRate !== null ? (
              <p className="font-display text-3xl font-semibold text-navy-900 dark:text-white">{attendanceRate}%</p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-navy-400">{dict.attendance.noRecords}</p>
            )}
          </Card>
        </FadeUpItem>
      </FadeUpStagger>

      <FadeUp delay={0.08} className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.announcements.title}</h2>
        {announcements.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.announcements.noAnnouncements}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy-900 dark:text-white">{a.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-navy-200">{a.body}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </FadeUp>

      <FadeUp delay={0.1} className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.parent.upcomingAssignments}</h2>
        {overview.assignments.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.assignments.noAssignments}</p>
          </Card>
        ) : (
          overview.assignments.map((a) => (
            <Card key={a.id} className="flex items-center justify-between">
              <p className="text-sm font-medium text-navy-900 dark:text-white">{a.title}</p>
              <span className="text-xs text-slate-400 dark:text-navy-500">{a.due_date}</span>
            </Card>
          ))
        )}
      </FadeUp>

      <FadeUp delay={0.14} className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.parent.upcomingExams}</h2>
        {overview.exams.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.exams.noExams}</p>
          </Card>
        ) : (
          overview.exams.map((e) => (
            <Card key={e.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-navy-900 dark:text-white">{e.title}</p>
                <Badge tone={e.exam_type === "quiz" ? "gold" : "navy"}>{e.exam_type}</Badge>
              </div>
              <span className="text-xs text-slate-400 dark:text-navy-500">{e.exam_date}</span>
            </Card>
          ))
        )}
      </FadeUp>

      <FadeUp delay={0.18} className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.parent.recentGrades}</h2>
        {overview.grades.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.grades.noGrades}</p>
          </Card>
        ) : (
          overview.grades.map((g) => (
            <Card key={g.id} className="flex items-center justify-between">
              <p className="text-sm font-medium text-navy-900 dark:text-white">{g.assessment_name}</p>
              <span className="text-xs text-slate-500 dark:text-navy-400">
                {g.marks_obtained}/{g.marks_total}
              </span>
            </Card>
          ))
        )}
      </FadeUp>

      {(overview.remarks.length > 0 || overview.behaviour.length > 0) && (
        <FadeUp delay={0.22} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.remarks.title}</h2>
            {overview.remarks.map((r) => (
              <Card key={r.id} className="text-sm">
                <p className="text-slate-600 dark:text-navy-200">{r.remark}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{new Date(r.created_at).toLocaleDateString()}</p>
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.behaviour.title}</h2>
            {overview.behaviour.map((b) => (
              <Card key={b.id} className="text-sm">
                <Badge tone={b.category === "positive" ? "green" : "red"}>{b.category}</Badge>
                <p className="mt-1.5 text-slate-600 dark:text-navy-200">{b.description}</p>
              </Card>
            ))}
          </div>
        </FadeUp>
      )}

      <FadeUp delay={0.26} className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.leave.title}</h2>
        <Card>
          <ChildLeaveForm studentId={activeChild.id} />
        </Card>
        {overview.leaveRequests.length === 0 ? (
          <EmptyState title={dict.leave.noRequests} />
        ) : (
          <div className="space-y-2">
            {overview.leaveRequests.map((r) => (
              <Card key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-navy-900 dark:text-white">
                    {r.start_date} – {r.end_date}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-navy-400">{r.reason}</p>
                </div>
                <Badge tone={LEAVE_TONE[r.status]}>{dict.leave[r.status]}</Badge>
              </Card>
            ))}
          </div>
        )}
      </FadeUp>
    </div>
  );
}
