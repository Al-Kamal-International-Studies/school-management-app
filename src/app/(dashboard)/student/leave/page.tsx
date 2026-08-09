import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeaveRequestForm } from "./LeaveRequestForm";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { LeaveStatus } from "@/lib/types/database.types";

const STATUS_TONE: Record<LeaveStatus, "amber" | "green" | "red"> = { pending: "amber", approved: "green", rejected: "red" };

export default async function StudentLeavePage() {
  const me = await requireRole("student");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("student_id", me.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.leave.title}</h1>
      </FadeUp>

      <FadeUp delay={0.05}>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.leave.newRequest}</h2>
          <LeaveRequestForm />
        </Card>
      </FadeUp>

      <FadeUp delay={0.1}>
        {!requests || requests.length === 0 ? (
          <EmptyState title={dict.leave.noRequests} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.leave.startDate}</Th>
                <Th>{dict.leave.endDate}</Th>
                <Th>{dict.leave.reason}</Th>
                <Th>{dict.leave.status}</Th>
              </tr>
            </Thead>
            <Tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{r.start_date}</Td>
                  <Td>{r.end_date}</Td>
                  <Td>{r.reason}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[r.status]}>{dict.leave[r.status]}</Badge>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
