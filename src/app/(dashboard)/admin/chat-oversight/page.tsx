import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Thead, Tbody, Th, Td, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

/**
 * Every chat in the school, for the chat overseer only (muhammad@, migration
 * 0047, HANDOVER Part 43). Other admins get a 404. RLS already limits the
 * chats select to what this user may read; the overseer check here just keeps
 * the page itself from existing for anyone else.
 */
export default async function ChatOversightPage() {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { data: overseer } = await supabase.rpc("is_chat_overseer", { p_user: me.id });
  if (overseer !== true) notFound();

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const { data: chats } = await supabase
    .from("chats")
    .select("*")
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false })
    .limit(500);

  const admin = createAdminClient();
  const personIds = [...new Set((chats ?? []).flatMap((c) => [c.user_a, c.user_b]).filter((id): id is string => !!id))];
  const cstIds = (chats ?? []).map((c) => c.cst_id).filter((id): id is string => !!id);
  const [{ data: people }, { data: csts }] = await Promise.all([
    personIds.length ? admin.from("profiles").select("id, full_name").in("id", personIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    cstIds.length
      ? admin.from("class_subject_teachers").select("id, class_id, subject_id").in("id", cstIds)
      : Promise.resolve({ data: [] as { id: string; class_id: string; subject_id: string }[] }),
  ]);
  const [{ data: classes }, { data: subjects }] = await Promise.all([
    admin.from("classes").select("id, name, section").in("id", [...new Set((csts ?? []).map((c) => c.class_id))]),
    admin.from("subjects").select("id, name").in("id", [...new Set((csts ?? []).map((c) => c.subject_id))]),
  ]);
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const cls = new Map((classes ?? []).map((c) => [c.id, `${c.name} - ${c.section}`]));
  const sub = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const group = new Map((csts ?? []).map((c) => [c.id, `${sub.get(c.subject_id) ?? ""} · ${cls.get(c.class_id) ?? ""}`]));
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-7">
      <PageHeader title={dict.chatOversight.title} description={dict.chatOversight.subtitle} />
      {!chats?.length ? (
        <EmptyState title={dict.chatOversight.empty} />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>{dict.chatOversight.between}</Th>
              <Th>{dict.chatOversight.lastMessage}</Th>
              <Th>
                <span className="sr-only">{dict.chatOversight.open}</span>
              </Th>
            </tr>
          </Thead>
          <Tbody>
            {chats.map((c) => (
              <tr key={c.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    {c.kind === "group" && <Badge tone="navy">{dict.messages.group}</Badge>}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {c.kind === "group" ? group.get(c.cst_id!) ?? "—" : `${name.get(c.user_a!) ?? "—"} · ${name.get(c.user_b!) ?? "—"}`}
                    </span>
                  </div>
                </Td>
                <Td>
                  <p className="max-w-md truncate text-sm text-slate-700 dark:text-navy-200">
                    <bdi dir="auto">{c.last_message_preview}</bdi>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-navy-400">{when.format(new Date(c.last_message_at!))}</p>
                </Td>
                <Td>
                  <Link href={`/messages/${c.id}`} className="text-sm font-medium text-navy-700 hover:underline dark:text-navy-200">
                    {dict.chatOversight.open}
                  </Link>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
