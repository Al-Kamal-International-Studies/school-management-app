import { listTeachersForSelect } from "../queries";
import { ClassForm } from "../ClassForm";

export default async function NewClassPage() {
  const teachers = await listTeachersForSelect();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Create class</h1>
        <p className="text-sm text-slate-500 dark:text-navy-400">e.g. "Grade 9" section "A".</p>
      </div>
      <div className="card p-6">
        <ClassForm teachers={teachers} />
      </div>
    </div>
  );
}
