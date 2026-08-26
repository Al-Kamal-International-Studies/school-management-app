import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewButtons } from "./ReviewButtons";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { LeaveStatus } from "@/lib/types/database.types";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

const STATUS_TONE: Record<LeaveStatus, "amber" | "green" | "red"> = { pending: "amber", approved: "green", rejected: "red" };

export default async function AdminLeaveRequestsPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();
  // requireRole("admin") above guarantees a profile, so this is never
  // actually null — see getActiveCenterForRequest's doc comment.
  const activeCenterId = (await getActiveCenterForRequest())!;

  // leave_requests has no center_id of its own (see 0027_centers.sql's
  // SCOPE comment) — reachable only via student_id -> profiles.id — so
  // this first resolves which active students belong to the active center
  // and filters on those. A center with zero students short-circuits
  // straight to an empty list rather than sending an empty `.in()`.
  const { data: studentsInCenter } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "student")
    .eq("center_id", activeCenterId);
  const nameMap = new Map((studentsInCenter ?? []).map((p) => [p.id, p.full_name]));
  const studentIdsInCenter = (studentsInCenter ?? []).map((p) => p.id);

  const { data: requests } = studentIdsInCenter.length
    ? await supabase.from("leave_requests").select("*").in("student_id", studentIdsInCenter).order("created_at", { ascending: false })
    : { data: [] };

  const all = requests ?? [];

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.leave.title}</h1>
      </FadeUp>
      <FadeUp delay={0.05}>
        {all.length === 0 ? (
          <EmptyState title={dict.leave.noRequests} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.progress.student}</Th>
                <Th>{dict.leave.startDate}</Th>
                <Th>{dict.leave.endDate}</Th>
                <Th>{dict.leave.reason}</Th>
                <Th>{dict.leave.status}</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {all.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{nameMap.get(r.student_id) ?? dict.common.unknown}</Td>
                  <Td>{r.start_date}</Td>
                  <Td>{r.end_date}</Td>
                  <Td className="max-w-xs truncate">{r.reason}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[r.status]}>{dict.leave[r.status]}</Badge>
                  </Td>
                  <Td>{r.status === "pending" && <ReviewButtons id={r.id} />}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
