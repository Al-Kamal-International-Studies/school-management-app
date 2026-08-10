import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function AuditLogPage() {
  await requireRole("admin");
  const dict = await getDictionary(await getLocale());
  const supabase = await createClient();
  const { data: logs } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);

  const all = logs ?? [];
  const actorIds = [...new Set(all.map((l) => l.actor_id).filter((id): id is string => !!id))];
  const { data: profiles } = actorIds.length ? await supabase.from("profiles").select("id, full_name").in("id", actorIds) : { data: [] };
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.adminAuditLog.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">
          {dict.adminAuditLog.subtitle}
        </p>
      </FadeUp>

      <FadeUp delay={0.05}>
        {all.length === 0 ? (
          <EmptyState title={dict.adminAuditLog.noEventsYet} />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>{dict.adminAuditLog.actor}</Th>
                <Th>{dict.adminAuditLog.action}</Th>
                <Th>{dict.adminAuditLog.target}</Th>
                <Th>{dict.adminAuditLog.when}</Th>
              </tr>
            </Thead>
            <Tbody>
              {all.map((l) => (
                <tr key={l.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{l.actor_id ? nameMap.get(l.actor_id) ?? dict.common.unknown : dict.common.system}</Td>
                  <Td className="font-mono text-xs">{l.action}</Td>
                  <Td className="text-xs text-slate-500 dark:text-navy-400">
                    {l.target_table ?? "—"} {l.target_id ? `· ${l.target_id.slice(0, 8)}…` : ""}
                  </Td>
                  <Td>{new Date(l.created_at).toLocaleString()}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </FadeUp>
    </div>
  );
}
