import { requireRole } from "@/lib/auth";
import { listMyStudents, listMyRemarks, listMyBehaviourEntries } from "./queries";
import { RemarkForm, BehaviourForm } from "./RemarkForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function TeacherRemarksPage() {
  const me = await requireRole("teacher");
  const dict = await getDictionary(await getLocale());
  const [students, remarks, behaviourEntries] = await Promise.all([
    listMyStudents(me.id),
    listMyRemarks(me.id),
    listMyBehaviourEntries(me.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">
          {dict.remarks.title} & {dict.behaviour.title}
        </h1>
      </FadeUp>

      <FadeUp delay={0.05} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.remarks.newRemark}</h2>
          <RemarkForm students={students} />
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-navy-900 dark:text-white">{dict.behaviour.newEntry}</h2>
          <BehaviourForm students={students} />
        </Card>
      </FadeUp>

      <FadeUp delay={0.1} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.remarks.title}</h2>
        {remarks.length === 0 ? (
          <EmptyState title={dict.remarks.noRemarks} />
        ) : (
          <div className="space-y-2">
            {remarks.map((r) => (
              <Card key={r.id} className="text-sm">
                <p className="font-medium text-navy-900 dark:text-white">{r.studentName}</p>
                <p className="mt-1 text-slate-600 dark:text-navy-200">{r.remark}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{new Date(r.created_at).toLocaleDateString()}</p>
              </Card>
            ))}
          </div>
        )}
      </FadeUp>

      <FadeUp delay={0.14} className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.behaviour.title}</h2>
        {behaviourEntries.length === 0 ? (
          <EmptyState title={dict.behaviour.noEntries} />
        ) : (
          <div className="space-y-2">
            {behaviourEntries.map((b) => (
              <Card key={b.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-navy-900 dark:text-white">{b.studentName}</p>
                  <Badge tone={b.category === "positive" ? "green" : "red"}>{b.category}</Badge>
                </div>
                <p className="mt-1 text-slate-600 dark:text-navy-200">{b.description}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-navy-500">{new Date(b.created_at).toLocaleDateString()}</p>
              </Card>
            ))}
          </div>
        )}
      </FadeUp>
    </div>
  );
}
