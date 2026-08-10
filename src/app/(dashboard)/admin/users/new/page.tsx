import { listClassesForSelect, listStudentsForParentLink } from "../queries";
import { NewUserForm } from "./NewUserForm";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function NewUserPage() {
  const dict = await getDictionary(await getLocale());
  const [classes, students] = await Promise.all([listClassesForSelect(), listStudentsForParentLink()]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{dict.adminUsers.addUserTitle}</h1>
        <p className="text-sm text-slate-500 dark:text-navy-400">{dict.adminUsers.addUserSubtitle}</p>
      </div>
      <div className="card p-6">
        <NewUserForm classes={classes} students={students} dict={dict} />
      </div>
    </div>
  );
}
