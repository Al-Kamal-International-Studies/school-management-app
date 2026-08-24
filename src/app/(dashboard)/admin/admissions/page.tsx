import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listAdmissions, listPendingOutboundEmails } from "./queries";
import { PendingEmailsPanel } from "./PendingEmailsPanel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import type { AdmissionStatus } from "@/lib/types/database.types";

const STATUS_TONE: Record<AdmissionStatus, "green" | "red" | "amber"> = {
  processed: "green",
  failed: "red",
  pending: "amber",
};

export default async function AdmissionsPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const [admissions, pendingEmails] = await Promise.all([listAdmissions(), listPendingOutboundEmails()]);

  const statusLabel: Record<AdmissionStatus, string> = {
    pending: dict.admissions.statusPending,
    processed: dict.admissions.statusProcessed,
    failed: dict.admissions.statusFailed,
  };

  return (
    <div className="space-y-8">
      <FadeUp className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 data-tour="page-title" className="font-display text-2xl font-semibold text-navy-900 dark:text-white">
            {dict.admissions.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-navy-400">{dict.admissions.subtitle}</p>
        </div>
        <Link href="/admin/admissions/new">
          <Button>{dict.admissions.newAdmission}</Button>
        </Link>
      </FadeUp>

      <FadeUp delay={0.05}>
        {admissions.length === 0 ? (
          <EmptyState title={dict.admissions.noAdmissionsYet} description={dict.admissions.noAdmissionsYetDescription} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.admissions.student}</Th>
                <Th>{dict.admissions.center}</Th>
                <Th>{dict.admissions.date}</Th>
                <Th>{dict.admissions.status}</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {admissions.map((a) => (
                <tr key={a.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">
                    <Link href={`/admin/admissions/${a.id}`} className="hover:text-navy-600">
                      {a.student_full_name}
                    </Link>
                  </Td>
                  <Td>{a.centerShortCode}</Td>
                  <Td>{new Date(a.registration_date).toLocaleDateString()}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[a.status]}>{statusLabel[a.status]}</Badge>
                  </Td>
                  <Td>
                    <Link href={`/admin/admissions/${a.id}`} className="text-sm font-medium text-navy-600 hover:text-navy-800 dark:text-gold-300 dark:hover:text-gold-200">
                      {dict.admissions.viewDetails}
                    </Link>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>

      <FadeUp delay={0.1} className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.pendingEmails}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">{dict.admissions.pendingEmailsDescription}</p>
        </div>
        <PendingEmailsPanel emails={pendingEmails} dict={dict} />
      </FadeUp>
    </div>
  );
}
