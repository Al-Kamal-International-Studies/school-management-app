import { listClassesForSelect, listStudentsForParentLink } from "../queries";
import { NewUserForm } from "./NewUserForm";

export default async function NewUserPage() {
  const [classes, students] = await Promise.all([listClassesForSelect(), listStudentsForParentLink()]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Add user</h1>
        <p className="text-sm text-slate-500 dark:text-navy-400">Create a teacher, student, or parent account. They'll sign in with the email and password you set here.</p>
      </div>
      <div className="card p-6">
        <NewUserForm classes={classes} students={students} />
      </div>
    </div>
  );
}
