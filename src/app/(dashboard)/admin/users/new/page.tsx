import { listClassesForSelect, listStudentsForParentLink } from "../queries";
import { NewUserForm } from "./NewUserForm";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { getActiveCenterForRequest } from "@/lib/centers/getActiveCenterForRequest";

export default async function NewUserPage() {
  const dict = await getDictionary(await getLocale());
  // admin/layout.tsx's requireRole("admin") guarantees a profile, so this
  // is never actually null — see getActiveCenterForRequest's doc comment.
  const activeCenterId = (await getActiveCenterForRequest())!;
  const [classes, students] = await Promise.all([listClassesForSelect(activeCenterId), listStudentsForParentLink(activeCenterId)]);

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
