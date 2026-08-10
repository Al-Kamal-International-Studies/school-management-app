import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listPendingPasswordResetRequests } from "./queries";
import { DismissButton } from "./DismissButton";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function AdminPasswordResetRequestsPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const requests = await listPendingPasswordResetRequests();

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.adminPasswordResetRequests.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.adminPasswordResetRequests.subtitle}</p>
      </FadeUp>

      <FadeUp delay={0.05}>
        {requests.length === 0 ? (
          <EmptyState title={dict.adminPasswordResetRequests.noRequests} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.adminPasswordResetRequests.email}</Th>
                <Th>{dict.adminPasswordResetRequests.requested}</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{r.email}</Td>
                  <Td>{new Date(r.created_at).toLocaleString()}</Td>
                  <Td>
                    <div className="flex items-center gap-4">
                      {r.profileId && (
                        <Link href={`/admin/users/${r.profileId}`} className="text-sm font-medium text-navy-600 hover:text-navy-800 dark:text-gold-300 dark:hover:text-gold-200">
                          {dict.adminPasswordResetRequests.viewAccount}
                        </Link>
                      )}
                      <DismissButton id={r.id} />
                    </div>
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
