import { notFound } from "next/navigation";
import { getUserDetail, listClassesForSelect, listStudentsForParentLink } from "../queries";
import { createClient } from "@/lib/supabase/server";
import { EditUserForm } from "./EditUserForm";
import { Badge } from "@/components/ui/Badge";
import { ToggleActiveButton } from "../ToggleActiveButton";
import { ArchiveUserButton } from "./ArchiveUserButton";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const classes = detail.profile.role === "student" ? await listClassesForSelect() : [];

  let allStudents: { id: string; label: string }[] | undefined;
  let linkedChildIds: string[] | undefined;
  if (detail.profile.role === "parent") {
    allStudents = await listStudentsForParentLink();
    const supabase = await createClient();
    const { data: links } = await supabase.from("parent_students").select("student_id").eq("parent_id", id);
    linkedChildIds = (links ?? []).map((l) => l.student_id);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{detail.profile.full_name}</h1>
          <p className="text-sm text-slate-500 dark:text-navy-400">{detail.profile.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {detail.profile.archived_at && <Badge tone="red">Archived</Badge>}
          <Badge tone={detail.profile.is_active ? "green" : "red"}>
            {detail.profile.is_active ? "Active" : "Deactivated"}
          </Badge>
          <ToggleActiveButton userId={detail.profile.id} isActive={detail.profile.is_active} />
          {!detail.profile.archived_at && <ArchiveUserButton userId={detail.profile.id} />}
        </div>
      </div>
      <div className="card p-6">
        <EditUserForm
          profile={detail.profile}
          student={detail.student}
          teacher={detail.teacher}
          classes={classes}
          allStudents={allStudents}
          linkedChildIds={linkedChildIds}
        />
      </div>
    </div>
  );
}
