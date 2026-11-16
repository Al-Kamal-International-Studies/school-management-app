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
  FileSignature,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section, SectionLink, ListCard, ListRows, ListRowLink, ListEmpty, DateBlock } from "@/components/ui/List";
import { getCurrentProfile } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { formatSchoolDate, formatSchoolDateTime } from "@/lib/dates";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";
import { getOverviewCounts, getAttendanceTrend, listRecentActivity, listUpcomingEvents } from "./queries";
import type { EventType } from "@/lib/types/database.types";

// Same tone mapping as /admin/events and /calendar, for a consistent look
// across every place events appear in the app.
const EVENT_TYPE_TONE: Record<EventType, "navy" | "gold" | "red"> = { event: "navy", holiday: "gold", deadline: "red" };

export default async function AdminOverviewPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  // admin/layout.tsx's requireRole("admin") already guarantees a logged-in
  // profile exists before this page ever renders, so the null case here
  // (see getActiveCenterForRequest's own doc comment) never actually
  // happens — the `!` just avoids re-deriving that same guarantee locally.
  const activeCenterId = (await getActiveCenterForRequest())!;

  const [profile, counts, attendanceTrend, recentActivity, upcomingEvents] = await Promise.all([
    // Already resolved by the (dashboard) layout's own auth check and
    // cache()-deduped (see lib/auth.ts) — this costs no extra round trip,
    // just the name for the new "Welcome, {name}" line above the page's
    // real title below.
    getCurrentProfile(),
    getOverviewCounts(activeCenterId),
    getAttendanceTrend(activeCenterId),
    listRecentActivity(6),
    listUpcomingEvents(activeCenterId, 5),
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
    <div className="space-y-7">
      <PageHeader
        eyebrow={profile ? `${dict.common.welcome}, ${profile.full_name}` : undefined}
        title={dict.adminOverview.title}
        description={dict.adminOverview.subtitle}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={dict.adminOverview.totalStudents} value={counts.studentCount} icon={GraduationCap} />
        <StatCard label={dict.adminOverview.totalTeachers} value={counts.teacherCount} icon={Users} />
        <StatCard label={dict.adminOverview.classes} value={counts.classCount} icon={School} />
        <StatCard
          label={dict.adminOverview.attendanceRate}
          value={attendanceTrend.thisWeekRate !== null ? `${attendanceTrend.thisWeekRate}%` : "—"}
          hint={dict.common.vsLastWeek}
          icon={CalendarCheck}
          delta={attendanceTrend.thisWeekRate !== null ? { value: attendanceTrend.delta, goodDirection: "up" } : undefined}
          trend={attendanceTrend.sparkline}
        />
      </div>

      {/* Muhammad, chat, 2026-09-09: "Quick actions section to be on the top
          part with the Overview" — kept directly under the stat row, ahead
          of everything else. One filled button (the most common task); the
          rest are secondary so the row doesn't shout. */}
      <Section id="admin-quick-actions" title={dict.adminOverview.quickActions}>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/users/new" className="btn-primary">
            <UserPlus className="h-4 w-4" />
            {dict.adminOverview.addStudentOrTeacher}
          </Link>
          <Link href="/admin/admissions/new" className="btn-secondary">
            <FileSignature className="h-4 w-4" />
            {dict.adminOverview.newAdmission}
          </Link>
          <Link href="/admin/classes/new" className="btn-secondary">
            <School className="h-4 w-4" />
            {dict.adminOverview.createClass}
          </Link>
          <Link href="/admin/subjects" className="btn-secondary">
            <BookMarked className="h-4 w-4" />
            {dict.adminOverview.manageSubjects}
          </Link>
          <Link href="/admin/timetable" className="btn-secondary">
            <CalendarClock className="h-4 w-4" />
            {dict.adminOverview.buildTimetable}
          </Link>
        </div>
      </Section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Section id="admin-attention" title={dict.adminOverview.needsAttention}>
          <ListCard>
            <ListRows>
              {needsAttentionTiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <ListRowLink
                    key={tile.key}
                    href={tile.href}
                    leading={<Icon className="h-[18px] w-[18px] shrink-0 text-slate-400 dark:text-navy-400" strokeWidth={1.75} aria-hidden="true" />}
                    title={tile.label}
                    subtitle={tile.value > 0 ? dict.adminOverview.reviewNow : dict.adminOverview.nothingPending}
                    trailing={
                      tile.value > 0 ? (
                        <Badge tone="amber">
                          <span className="tabular">{tile.value}</span>
                        </Badge>
                      ) : (
                        <span className="tabular shrink-0 text-sm text-slate-400 dark:text-navy-500">0</span>
                      )
                    }
                  />
                );
              })}
            </ListRows>
          </ListCard>
        </Section>

        <Section id="admin-events" title={dict.adminOverview.upcomingEvents} action={<SectionLink href="/admin/events">{dict.common.viewAll}</SectionLink>}>
          <ListCard>
            {upcomingEvents.length === 0 ? (
              <ListEmpty>{dict.adminOverview.noUpcomingEvents}</ListEmpty>
            ) : (
              <ListRows>
                {/* No dedicated per-event page exists (events are managed
                    inline on /admin/events) — rows link to the list page
                    itself rather than a route that doesn't exist. */}
                {upcomingEvents.map((e) => (
                  <ListRowLink
                    key={e.id}
                    href="/admin/events"
                    leading={
                      <DateBlock
                        day={formatSchoolDate(e.event_date, locale, { day: "numeric" })}
                        month={formatSchoolDate(e.event_date, locale, { month: "short" })}
                      />
                    }
                    title={e.title}
                    trailing={<Badge tone={EVENT_TYPE_TONE[e.event_type]}>{e.event_type}</Badge>}
                  />
                ))}
              </ListRows>
            )}
          </ListCard>
        </Section>

        <Section id="admin-activity" title={dict.adminOverview.recentActivity} action={<SectionLink href="/admin/audit-log">{dict.common.viewAll}</SectionLink>}>
          <ListCard>
            {recentActivity.length === 0 ? (
              <ListEmpty>{dict.adminOverview.noRecentActivity}</ListEmpty>
            ) : (
              <ListRows>
                {/* Same story as events: the audit log has no per-entry
                    detail route, just one flat table page. */}
                {recentActivity.map((item) => (
                  <ListRowLink
                    key={item.id}
                    href="/admin/audit-log"
                    title={item.actorName ?? dict.common.system}
                    subtitle={
                      <>
                        <span className="font-mono">{item.action}</span>
                        <span aria-hidden="true"> · </span>
                        <time dateTime={item.createdAt}>{formatSchoolDateTime(item.createdAt, locale)}</time>
                      </>
                    }
                  />
                ))}
              </ListRows>
            )}
          </ListCard>
        </Section>
      </div>
    </div>
  );
}
