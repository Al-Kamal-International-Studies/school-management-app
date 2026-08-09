import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";

export default async function AuditLogPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: logs } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);

  const all = logs ?? [];
  const actorIds = [...new Set(all.map((l) => l.actor_id).filter((id): id is string => !!id))];
  const { data: profiles } = actorIds.length ? await supabase.from("profiles").select("id, full_name").in("id", actorIds) : { data: [] };
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">
          A record of sensitive admin actions — account creation, activation/deactivation, archiving, and leave-request
          decisions. Not every action in the app is logged, only the highest-risk ones.
        </p>
      </FadeUp>

      <FadeUp delay={0.05}>
        {all.length === 0 ? (
          <EmptyState title="No audit events yet" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>When</Th>
              </tr>
            </Thead>
            <Tbody>
              {all.map((l) => (
                <tr key={l.id}>
                  <Td className="font-medium text-slate-900 dark:text-white">{l.actor_id ? nameMap.get(l.actor_id) ?? "Unknown" : "System"}</Td>
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
