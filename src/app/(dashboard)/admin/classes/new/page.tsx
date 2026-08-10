import { listTeachersForSelect } from "../queries";
import { ClassForm } from "../ClassForm";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function NewClassPage() {
  const teachers = await listTeachersForSelect();
  const dict = await getDictionary(await getLocale());

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{dict.adminClasses.createClass}</h1>
        <p className="text-sm text-slate-500 dark:text-navy-400">{dict.adminClasses.createClassSubtitle}</p>
      </div>
      <div className="card p-6">
        <ClassForm teachers={teachers} />
      </div>
    </div>
  );
}
