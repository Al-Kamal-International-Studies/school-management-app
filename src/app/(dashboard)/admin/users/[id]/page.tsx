import { notFound } from "next/navigation";
import { getUserDetail, listClassesForSelect, listStudentsForParentLink } from "../queries";
import { createClient } from "@/lib/supabase/server";
import { EditUserForm } from "./EditUserForm";
import { AdminSetPasswordForm } from "./AdminSetPasswordForm";
import { Badge } from "@/components/ui/Badge";
import { ToggleActiveButton } from "../ToggleActiveButton";
import { ArchiveUserButton } from "./ArchiveUserButton";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { MIN_PASSWORD_LENGTH } from "@/lib/security/password";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();
  const dict = await getDictionary(await getLocale());
  // admin/layout.tsx's requireRole("admin") guarantees a profile, so this
  // is never actually null — see getActiveCenterForRequest's doc comment.
  // These dropdowns (class / linkable children) must offer the EDITED
  // ACCOUNT's center, not the admin's currently-active one: getUserDetail is
  // intentionally not center-filtered (a principal can reach an AKET account
  // from a link while viewing AKIS), and a <select> that lacks the account's
  // current value silently submits "" — which used to unassign a student's
  // class or unlink a parent from every child on an innocent phone-number
  // edit (found in the 2026-10-02 audit, HANDOVER Part 33).
  const userCenterId = detail.profile.center_id;
  const isAdminAccount = detail.profile.role === "admin";

  const classes = detail.profile.role === "student" ? await listClassesForSelect(userCenterId) : [];

  let allStudents: { id: string; label: string }[] | undefined;
  let linkedChildIds: string[] | undefined;
  if (detail.profile.role === "parent") {
    allStudents = await listStudentsForParentLink(userCenterId);
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
          {detail.profile.archived_at && <Badge tone="red">{dict.common.archived}</Badge>}
          <Badge tone={detail.profile.is_active ? "green" : "red"}>
            {detail.profile.is_active ? dict.common.active : dict.common.deactivated}
          </Badge>
          {/* Admin accounts can't be (de)activated or deleted from here, and an
              archived ("permanently deleted") account must not be re-enabled by the Active switch. */}
          {!isAdminAccount && !detail.profile.archived_at && (
            <ToggleActiveButton userId={detail.profile.id} isActive={detail.profile.is_active} />
          )}
          {!isAdminAccount && !detail.profile.archived_at && <ArchiveUserButton userId={detail.profile.id} />}
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
          dict={dict}
        />
      </div>

      {!isAdminAccount && (
        <div className="card space-y-4 p-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.adminUsers.setPassword}</h2>
          <AdminSetPasswordForm userId={detail.profile.id} minLength={MIN_PASSWORD_LENGTH} />
        </div>
      )}
    </div>
  );
}
