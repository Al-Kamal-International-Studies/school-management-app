import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleLabel } from "@/lib/i18n/labels";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { VerdictButtons } from "./VerdictButtons";

/**
 * Admin review of the chat safety filter's log (HANDOVER Part 42): every
 * blocked attempt and every borderline message that was delivered.
 */
export default async function MessageSafetyPage() {
  await requireRole("admin");
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const supabase = await createClient();
  const { data: flags } = await supabase.from("message_flags").select("*").order("created_at", { ascending: false }).limit(200);

  const senderIds = [...new Set((flags ?? []).map((f) => f.sender_id).filter((id): id is string => !!id))];
  const { data: senders } = senderIds.length
    ? await createAdminClient().from("profiles").select("id, full_name, role").in("id", senderIds)
    : { data: [] };
  const who = new Map((senders ?? []).map((s) => [s.id, s]));
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const reasonText = (r: string) =>
    r === "self_harm"
      ? dict.messageSafety.reasonSelfHarm
      : r === "model"
        ? dict.messageSafety.reasonModel
        : r === "phrase"
          ? dict.messageSafety.reasonPhrase
          : dict.messageSafety.reasonWord;

  return (
    <div className="space-y-7">
      <PageHeader title={dict.messageSafety.title} description={dict.messageSafety.subtitle} />
      {!flags?.length ? (
        <EmptyState title={dict.messageSafety.empty} />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>{dict.messageSafety.from}</Th>
              <Th>{dict.messages.title}</Th>
              <Th>{dict.messageSafety.reasons}</Th>
              <Th>{dict.messageSafety.harmful}?</Th>
            </tr>
          </Thead>
          <Tbody>
            {flags.map((f) => {
              const s = f.sender_id ? who.get(f.sender_id) : undefined;
              return (
                <tr key={f.id}>
                  <Td>
                    <p className="font-medium text-slate-900 dark:text-white">{s?.full_name ?? dict.common.unknown}</p>
                    <p className="text-xs text-slate-500 dark:text-navy-400">
                      {s?.role ? roleLabel(dict, s.role) : ""} · {when.format(new Date(f.created_at))}
                    </p>
                  </Td>
                  <Td>
                    <p className="max-w-md whitespace-pre-wrap break-words text-sm text-slate-800 [overflow-wrap:anywhere] dark:text-navy-100">
                      <bdi dir="auto">{f.content}</bdi>
                    </p>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={f.action === "blocked" ? "red" : "amber"}>
                        {f.action === "blocked" ? dict.messageSafety.blocked : dict.messageSafety.flagged}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-navy-400">
                        {[...new Set(f.reasons.map(reasonText))].join(", ")}
                        {f.score != null && ` · ${dict.messageSafety.score} ${f.score.toFixed(2)}`}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <VerdictButtons id={f.id} verdict={f.verdict} />
                  </Td>
                </tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
