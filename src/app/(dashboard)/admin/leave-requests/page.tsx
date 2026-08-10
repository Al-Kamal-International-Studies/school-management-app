import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewButtons } from "./ReviewButtons";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { LeaveStatus } from "@/lib/types/database.types";

const STATUS_TONE: Record<LeaveStatus, "amber" | "green" | "red"> = { pending: "amber", approved: "green", rejected: "red" };

export default async function AdminLeaveRequestsPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();
  const { data: requests } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false });

  const all = requests ?? [];
  const studentIds = [...new Set(all.map((r) => r.student_id))];
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] };
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

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
