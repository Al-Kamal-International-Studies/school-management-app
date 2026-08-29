/** The shape cached for a dashboard's offline summary — deliberately small
 * and deliberately read-only (see offlineCache.ts's own doc comment).
 * Shared between whichever role dashboards write it (parent/page.tsx today
 * — see HANDOVER.md for which roles are covered so far and which aren't
 * yet) and app/offline/page.tsx, which reads it back. */
export interface DashboardOfflineSummary {
  displayName: string;
  subtitle?: string;
  overallScore: number | null;
  attendanceRate: number | null;
  announcements: { title: string; date: string }[];
}
