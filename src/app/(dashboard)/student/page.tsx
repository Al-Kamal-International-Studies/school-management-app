import { behaviourLabel } from "@/lib/i18n/labels";
import { getCurrentProfile } from "@/lib/auth";
import {
  getMyClassInfo,
  getMySchedule,
  listMyProgressEntries,
  listMyRemarks,
  listMyBehaviourEntries,
  listMyRecentGrades,
  listUpcomingItems,
  listMyAttendance,
} from "./queries";
import { listVisibleAnnouncements } from "@/lib/queries/announcements";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Sparkline, TrendDelta } from "@/components/ui/Sparkline";
import { formatTime } from "@/lib/utils";
import { schoolWeekdayDb, formatSchoolDate } from "@/lib/dates";
import { attendanceRate, monthlyAttendanceRates, ATTENDANCE_WINDOW } from "@/lib/attendance/rate";
import { formatMonth, summarizeByMonth } from "@/lib/progress/calculate";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section, ListCard, ListRows, ListRowLink, ListEmpty } from "@/components/ui/List";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

// Where each upcoming-item kind's own list page lives — assignments and
// exams/quizzes are separate pages for a student, so the destination
// differs per row rather than being one fixed href.
const UPCOMING_KIND_HREF = { assignment: "/student/assignments", exam: "/student/exams", quiz: "/student/exams" } as const;

export default async function StudentDashboardPage() {
  const profile = await getCurrentProfile();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const { student, classRow } = await getMyClassInfo(profile!.id);
  const [schedule, progressEntries, announcements, remarks, behaviourEntries, recentGrades, upcomingItems, attendanceRecords] = await Promise.all([
    getMySchedule(student?.class_id ?? null),
    listMyProgressEntries(profile!.id),
    listVisibleAnnouncements(5),
    listMyRemarks(profile!.id),
    listMyBehaviourEntries(profile!.id),
    listMyRecentGrades(profile!.id),
    listUpcomingItems(student?.class_id ?? null),
    listMyAttendance(profile!.id),
  ]);

  const todayDbDay = schoolWeekdayDb();
  const todaysClasses = schedule.filter((e) => e.day_of_week === todayDbDay);

  const monthly = summarizeByMonth(progressEntries);
  const latest = monthly[0];
  const maxScore = Math.max(100, ...monthly.map((m) => m.averageScore));
  const recentComments = progressEntries.filter((e) => e.teacher_comments).slice(0, 4);

  // Chronological (oldest first) for the sparklines; the delta compares the
  // latest month to the one before it.
  const scoreTrend = monthly.slice(0, 6).map((m) => m.averageScore).reverse();
  // Attendance comes from the real attendance records — the same numbers (and the
  // same late/excused policy) as the Attendance page — not from the teacher-typed
  // monthly progress figure, which used to contradict it (audit finding SP-06).
  const attendanceMonths = monthlyAttendanceRates(attendanceRecords);
  const attendanceNow = attendanceRate(attendanceRecords.slice(0, ATTENDANCE_WINDOW));
  const attendanceTrend = attendanceMonths.slice(0, 6).map((m) => m.rate).reverse();
  const scoreDelta = monthly.length > 1 ? monthly[0]!.averageScore - monthly[1]!.averageScore : null;
  const attendanceDelta = attendanceMonths.length > 1 ? attendanceMonths[0]!.rate - attendanceMonths[1]!.rate : null;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={formatSchoolDate(new Date(), locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        title={`${dict.common.welcome}, ${profile!.full_name}`}
        description={
          <>
            {classRow ? `${classRow.name} - ${classRow.section}` : dict.studentDashboard.noClassAssignedShort} · {dict.studentDashboard.enrollmentHash}
            {student?.enrollment_number}
          </>
        }
      />

      {!classRow && <Alert tone="info">{dict.myTimetable.noClassAssigned}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="card-title">{dict.progress.academicProgress}</h2>
            {monthly.length > 1 && <TrendDelta value={scoreDelta} goodDirection="up" />}
          </div>
          {latest ? (
            <div className="mt-4 flex items-center gap-5">
              <ProgressRing value={latest.averageScore} label={dict.progress.overallScore} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 dark:text-navy-400">{formatMonth(latest.month)}</p>
                {scoreTrend.length > 1 && (
                  <div className="mt-3">
                    <Sparkline points={scoreTrend} height={28} />
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
            <h2 className="card-title">{dict.progress.attendanceSummary}</h2>
            {attendanceMonths.length > 1 && <TrendDelta value={attendanceDelta} goodDirection="up" />}
          </div>
          {attendanceNow !== null ? (
            <div className="mt-4">
              <p className="tabular font-display text-[2rem] font-semibold leading-none text-navy-950 dark:text-white">
                {attendanceNow.toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-navy-400">{formatMonth(attendanceMonths[0]!.month)}</p>
              {attendanceTrend.length > 1 && (
                <div className="mt-3">
                  <Sparkline points={attendanceTrend} height={28} />
                  <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{dict.progress.vsLastMonth}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-navy-400">{dict.progress.noProgressYetDescription}</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section id="student-today" title={dict.common.todaysSchedule}>
            <ListCard>
              {todaysClasses.length === 0 ? (
                <ListEmpty>{dict.common.noClassesToday}</ListEmpty>
              ) : (
                <ListRows>
                  {/* No per-timeslot detail page exists — rows link to the
                      full weekly timetable, the closest real destination. */}
                  {todaysClasses.map((e) => (
                    <ListRowLink
                      key={e.id}
                      href="/student/timetable"
                      leading={
                        <span className="tabular w-[8.75rem] shrink-0 whitespace-nowrap text-sm text-slate-500 dark:text-navy-400">
                          <bdi dir="ltr">{formatTime(e.start_time)} – {formatTime(e.end_time)}</bdi>
                        </span>
                      }
                      title={e.subjectName}
                      subtitle={e.teacherName}
                      trailing={
                        e.room ? (
                          <span className="shrink-0 text-xs text-slate-500 dark:text-navy-400">
                            {dict.exams.room} <bdi>{e.room}</bdi>
                          </span>
                        ) : undefined
                      }
                    />
                  ))}
                </ListRows>
              )}
            </ListCard>
          </Section>

          <Section id="student-upcoming" title={dict.progress.upcomingTasks}>
            <ListCard>
              {upcomingItems.length === 0 ? (
                <ListEmpty>{dict.progress.noUpcomingItems}</ListEmpty>
              ) : (
                <ListRows>
                  {/* Assignments and exams/quizzes are two separate list
                      pages for a student — no shared per-item detail page —
                      so each row links to whichever list contains it. */}
                  {upcomingItems.map((item) => (
                    <ListRowLink
                      key={`${item.kind}-${item.id}`}
                      href={UPCOMING_KIND_HREF[item.kind]}
                      title={item.title}
                      subtitle={item.subjectName}
                      trailing={
                        <span className="flex shrink-0 items-center gap-3">
                          <Badge tone="navy">
                            {item.kind === "assignment" ? dict.assignments.assignment : item.kind === "quiz" ? dict.exams.quiz : dict.exams.exam}
                          </Badge>
                          <span className="tabular hidden text-xs text-slate-500 dark:text-navy-400 sm:inline">{item.date}</span>
                        </span>
                      }
                    />
                  ))}
                </ListRows>
              )}
            </ListCard>
          </Section>
        </div>

        <Section id="student-announcements" title={dict.announcements.title}>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section id="student-grades" title={dict.grades.recentGrades}>
          <ListCard>
            {recentGrades.length === 0 ? (
              <ListEmpty>{dict.grades.noGrades}</ListEmpty>
            ) : (
              <ListRows>
                {/* No per-grade detail page exists — rows link to the full
                    grades list, the closest real destination. */}
                {recentGrades.map((g) => (
                  <ListRowLink
                    key={g.id}
                    href="/student/grades"
                    title={g.assessment_name}
                    subtitle={g.subjectName}
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

        <Section id="student-comments" title={dict.progress.recentComments}>
          <ListCard>
            {recentComments.length === 0 ? (
              <ListEmpty>{dict.progress.noProgressYetDescription}</ListEmpty>
            ) : (
              <ListRows>
                {recentComments.map((e) => (
                  <li key={e.id} className="px-5 py-4">
                    <p className="text-xs font-medium text-slate-500 dark:text-navy-400">
                      {e.subjectName} · {formatMonth(e.month)}
                    </p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-navy-100">{e.teacher_comments}</p>
                  </li>
                ))}
              </ListRows>
            )}
          </ListCard>
        </Section>
      </div>

      <Section id="student-monthly" title={dict.progress.monthlyOverview}>
        <Card className="p-5">
          {monthly.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-navy-400">{dict.progress.noProgressYet}</p>
          ) : (
            <div className="space-y-3">
              {monthly.slice(0, 6).map((m) => (
                <div key={m.month} className="flex items-center gap-4">
                  <span className="w-28 shrink-0 text-sm text-slate-500 dark:text-navy-400">{formatMonth(m.month)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
                    <div
                      className="h-full rounded-full bg-navy-700 dark:bg-navy-300"
                      style={{ width: `${Math.min(100, (m.averageScore / maxScore) * 100)}%` }}
                    />
                  </div>
                  <span className="tabular w-12 shrink-0 text-end text-sm font-semibold text-slate-900 dark:text-white">
                    {m.averageScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      {(remarks.length > 0 || behaviourEntries.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Section id="student-remarks" title={dict.remarks.title}>
            <ListCard>
              {remarks.length === 0 ? (
                <ListEmpty>{dict.remarks.noRemarks}</ListEmpty>
              ) : (
                <ListRows>
                  {remarks.map((r) => (
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
          <Section id="student-behaviour" title={dict.behaviour.title}>
            <ListCard>
              {behaviourEntries.length === 0 ? (
                <ListEmpty>{dict.behaviour.noEntries}</ListEmpty>
              ) : (
                <ListRows>
                  {behaviourEntries.map((b) => (
                    <li key={b.id} className="px-5 py-4 text-sm">
                      <Badge tone={b.category === "positive" ? "green" : "red"}>{behaviourLabel(dict, b.category)}</Badge>
                      <p className="mt-2 text-slate-700 dark:text-navy-100">{b.description}</p>
                      <p className="mt-1.5 text-xs text-slate-400 dark:text-navy-500">
                        <time dateTime={b.created_at}>{formatSchoolDate(b.created_at, locale)}</time>
                      </p>
                    </li>
                  ))}
                </ListRows>
              )}
            </ListCard>
          </Section>
        </div>
      )}
    </div>
  );
}
