import { requireRole } from "@/lib/auth";
import { listAllFeedback } from "./queries";
import { StatusSelect } from "./StatusSelect";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

const CATEGORY_TONE = {
  technical: "red",
  academic: "navy",
  suggestion: "gold",
  general: "slate",
} as const;

export default async function AdminFeedbackPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  // requireRole("admin") above guarantees a profile, so this is never
  // actually null — see getActiveCenterForRequest's doc comment.
  const activeCenterId = (await getActiveCenterForRequest())!;
  const entries = await listAllFeedback(activeCenterId);

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.feedback.inbox}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">
          {dict.feedback.inboxSubtitle}
        </p>
      </FadeUp>

      <FadeUp delay={0.08}>
        {entries.length === 0 ? (
          <EmptyState title={dict.feedback.noFeedback} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.feedback.from}</Th>
                <Th>{dict.feedback.category}</Th>
                <Th>{dict.feedback.subject}</Th>
                <Th>{dict.announcements.posted}</Th>
                <Th>{dict.feedback.status}</Th>
              </tr>
            </Thead>
            <Tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <Td>
                    <p className="font-medium text-slate-900 dark:text-white">{e.user?.full_name ?? dict.common.unknown}</p>
                    <p className="text-xs text-slate-400 dark:text-navy-500">
                      {e.user?.role} · {e.user?.email}
                    </p>
                  </Td>
                  <Td>
                    <Badge tone={CATEGORY_TONE[e.category]}>{e.category}</Badge>
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-900 dark:text-white">{e.subject}</p>
                    <p className="max-w-xs truncate text-xs text-slate-500 dark:text-navy-400">{e.message}</p>
                  </Td>
                  <Td>{new Date(e.created_at).toLocaleDateString()}</Td>
                  <Td>
                    <StatusSelect id={e.id} status={e.status} />
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
