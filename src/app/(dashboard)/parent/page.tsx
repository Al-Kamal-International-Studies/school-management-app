import { examTypeLabel, behaviourLabel } from "@/lib/i18n/labels";
import { getCurrentProfile } from "@/lib/auth";
import { listMyChildren, getChildOverview } from "./queries";
import { listVisibleAnnouncements } from "@/lib/queries/announcements";
import { ChildLeaveForm } from "./ChildLeaveForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Sparkline, TrendDelta } from "@/components/ui/Sparkline";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section, ListCard, ListRows, ListRow, ListEmpty } from "@/components/ui/List";
import { formatMonth } from "@/lib/progress/calculate";
import { cn, initials } from "@/lib/utils";
import { formatSchoolDate } from "@/lib/dates";
import { attendanceRate as computeAttendanceRate } from "@/lib/attendance/rate";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { LeaveStatus } from "@/lib/types/database.types";

const LEAVE_TONE: Record<LeaveStatus, "amber" | "green" | "red"> = { pending: "amber", approved: "green", rejected: "red" };

export default async function ParentDashboardPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const me = await getCurrentProfile();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  if (!me) return null;

  const children = await listMyChildren(me.id);
  const { child: childParam } = await searchParams;
  const activeChild = children.find((c) => c.id === childParam) ?? children[0];
  const greeting = `${dict.common.welcome}, ${me.full_name}`;

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader eyebrow={greeting} title={dict.parent.title} />
        <Alert tone="info">{dict.parent.noChildren}</Alert>
      </div>
    );
  }

  const [overview, announcements] = await Promise.all([getChildOverview(activeChild.id), listVisibleAnnouncements(5)]);
  const attendanceRate = computeAttendanceRate(overview.attendance);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={greeting}
        title={activeChild.full_name}
        titleDataTour="page-title"
        description={`${activeChild.className ?? dict.common.notAssigned} · #${activeChild.enrollment_number}`}
        action={
          children.length > 1 ? (
            // Segmented switcher between linked children — plain links
            // (full navigation), so the server re-renders for the new child.
            <nav aria-label={dict.parent.title} className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-navy-700 dark:bg-navy-900">
              {children.map((c) => {
                const selected = c.id === activeChild.id;
                return (
                  <a
                    key={c.id}
                    href={`/parent?child=${c.id}`}
                    aria-current={selected ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-md ps-1.5 pe-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500",
                      selected
                        ? "bg-navy-900 text-white dark:bg-navy-100 dark:text-navy-950"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-navy-300 dark:hover:bg-white/10 dark:hover:text-white"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px]",
                        selected ? "bg-white/15 dark:bg-navy-950/10" : "bg-slate-100 dark:bg-navy-800"
                      )}
                    >
                      {initials(c.full_name)}
                    </span>
                    {c.full_name}
                  </a>
                );
              })}
            </nav>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="card-title">{dict.progress.academicProgress}</h2>
            {overview.scoreDelta !== null && <TrendDelta value={overview.scoreDelta} goodDirection="up" />}
          </div>
          {overview.overallScore !== null ? (
            <div className="mt-4 flex items-center gap-5">
              <ProgressRing value={overview.overallScore} label={dict.progress.overallScore} />
              <div className="min-w-0 flex-1">
                {overview.latestMonth && <p className="text-xs text-slate-500 dark:text-navy-400">{formatMonth(overview.latestMonth)}</p>}
                {overview.scoreTrend.length > 1 && (
                  <div className="mt-3">
                    <Sparkline points={overview.scoreTrend} height={28} />
                    <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{dict.progress.vsLastMonth}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-navy-400">{dict.progress.noProgressYetDescription}</p>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="card-title">{dict.attendance.title}</h2>
            {overview.attendanceDelta !== null && <TrendDelta value={overview.attendanceDelta} goodDirection="up" />}
          </div>
          {attendanceRate !== null ? (
            <div className="mt-4">
              <p className="tabular font-display text-[2rem] font-semibold leading-none text-navy-950 dark:text-white">{attendanceRate}%</p>
              {overview.attendanceTrend.length > 1 && (
                <div className="mt-4">
                  <Sparkline points={overview.attendanceTrend} height={28} />
                  <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{dict.common.vsLastWeek}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-navy-400">{dict.attendance.noRecords}</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section id="parent-assignments" title={dict.parent.upcomingAssignments}>
            <ListCard>
              {overview.assignments.length === 0 ? (
                <ListEmpty>{dict.assignments.noAssignments}</ListEmpty>
              ) : (
                <ListRows>
                  {overview.assignments.map((a) => (
                    <ListRow
                      key={a.id}
                      title={a.title}
                      trailing={<span className="tabular shrink-0 text-xs text-slate-500 dark:text-navy-400">{a.due_date}</span>}
                    />
                  ))}
                </ListRows>
              )}
            </ListCard>
          </Section>

          <Section id="parent-exams" title={dict.parent.upcomingExams}>
            <ListCard>
              {overview.exams.length === 0 ? (
                <ListEmpty>{dict.exams.noExams}</ListEmpty>
              ) : (
                <ListRows>
                  {overview.exams.map((e) => (
                    <ListRow
                      key={e.id}
                      title={e.title}
                      trailing={
                        <span className="flex shrink-0 items-center gap-3">
                          <Badge tone="navy">{examTypeLabel(dict, e.exam_type)}</Badge>
                          <span className="tabular text-xs text-slate-500 dark:text-navy-400">{e.exam_date}</span>
                        </span>
                      }
                    />
                  ))}
                </ListRows>
              )}
            </ListCard>
          </Section>

          <Section id="parent-grades" title={dict.parent.recentGrades}>
            <ListCard>
              {overview.grades.length === 0 ? (
                <ListEmpty>{dict.grades.noGrades}</ListEmpty>
              ) : (
                <ListRows>
                  {overview.grades.map((g) => (
                    <ListRow
                      key={g.id}
                      title={g.assessment_name}
                      trailing={
                        <span className="tabular shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                          {g.marks_obtained}/{g.marks_total}
                        </span>
                      }
                    />
                  ))}
                </ListRows>
              )}
            </ListCard>
          </Section>
        </div>

        <Section id="parent-announcements" title={dict.announcements.title}>
          <ListCard>
            {announcements.length === 0 ? (
              <ListEmpty>{dict.announcements.noAnnouncements}</ListEmpty>
            ) : (
              <ListRows>
                {announcements.map((a) => (
                  <li key={a.id} className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                    <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-navy-300">{a.body}</p>
                    <p className="mt-2 text-xs text-slate-400 dark:text-navy-500">
                      <time dateTime={a.created_at}>{formatSchoolDate(a.created_at, locale)}</time>
                    </p>
                  </li>
                ))}
              </ListRows>
            )}
          </ListCard>
        </Section>
      </div>

      {(overview.remarks.length > 0 || overview.behaviour.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Section id="parent-remarks" title={dict.remarks.title}>
            <ListCard>
              {overview.remarks.length === 0 ? (
                <ListEmpty>{dict.remarks.noRemarks}</ListEmpty>
              ) : (
                <ListRows>
                  {overview.remarks.map((r) => (
                    <li key={r.id} className="px-5 py-4 text-sm">
                      <p className="text-slate-700 dark:text-navy-100">{r.remark}</p>
                      <p className="mt-1.5 text-xs text-slate-400 dark:text-navy-500">
                        <time dateTime={r.created_at}>{formatSchoolDate(r.created_at, locale)}</time>
                      </p>
                    </li>
                  ))}
                </ListRows>
              )}
            </ListCard>
          </Section>
          <Section id="parent-behaviour" title={dict.behaviour.title}>
            <ListCard>
              {overview.behaviour.length === 0 ? (
                <ListEmpty>{dict.behaviour.noEntries}</ListEmpty>
              ) : (
                <ListRows>
                  {overview.behaviour.map((b) => (
                    <li key={b.id} className="px-5 py-4 text-sm">
                      <Badge tone={b.category === "positive" ? "green" : "red"}>{behaviourLabel(dict, b.category)}</Badge>
                      <p className="mt-2 text-slate-700 dark:text-navy-100">{b.description}</p>
                    </li>
                  ))}
                </ListRows>
              )}
            </ListCard>
          </Section>
        </div>
      )}

      <Section id="parent-leave" title={dict.leave.title}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-3">
            <ChildLeaveForm studentId={activeChild.id} />
          </Card>
          <ListCard className="self-start lg:col-span-2">
            {overview.leaveRequests.length === 0 ? (
              <ListEmpty>{dict.leave.noRequests}</ListEmpty>
            ) : (
              <ListRows>
                {overview.leaveRequests.map((r) => (
                  <ListRow
                    key={r.id}
                    title={
                      <bdi dir="ltr" className="tabular">
                        {r.start_date} – {r.end_date}
                      </bdi>
                    }
                    subtitle={r.reason}
                    trailing={<Badge tone={LEAVE_TONE[r.status]}>{dict.leave[r.status]}</Badge>}
                  />
                ))}
              </ListRows>
            )}
          </ListCard>
        </div>
      </Section>
    </div>
  );
}
