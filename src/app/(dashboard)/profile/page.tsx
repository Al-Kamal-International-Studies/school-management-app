import { IdCard, BookOpen, School } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getOwnAccountDetails } from "./queries";
import { AvatarUpload } from "./AvatarUpload";
import { ProfileForm } from "./ProfileForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const dict = await getDictionary(await getLocale());
  const { teacher, student, className } = await getOwnAccountDetails(profile.id, profile.role);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FadeUp>
        <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{dict.profilePage.title}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-navy-400">{dict.profilePage.subtitle}</p>
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card>
          <div className="flex flex-col items-center gap-5 border-b border-slate-100 dark:border-navy-800 pb-7 sm:flex-row sm:items-start">
            <AvatarUpload userId={profile.id} fullName={profile.full_name} avatarUrl={profile.avatar_url} />
            <div className="text-center sm:text-left">
              <h2 className="font-display text-lg font-semibold text-navy-900 dark:text-white">{profile.full_name}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-navy-400">{profile.email}</p>
              <div className="mt-2">
                <Badge tone={profile.role === "admin" ? "navy" : profile.role === "teacher" ? "green" : "gold"}>
                  {profile.title || profile.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="pt-7">
            <ProfileForm profile={profile} dict={dict} />
          </div>
        </Card>
      </FadeUp>

      {(teacher || student) && (
        <FadeUp delay={0.16}>
          <Card>
            <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-navy-100">
              <IdCard className="h-4 w-4 text-navy-500" />
              {dict.profilePage.accountDetails}
            </h2>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {teacher && (
                <>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-500">{dict.profilePage.employeeId}</dt>
                    <dd className="mt-1.5 text-sm text-slate-700 dark:text-navy-100">{teacher.employee_id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-500">{dict.profilePage.qualification}</dt>
                    <dd className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-700 dark:text-navy-100">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400 dark:text-navy-500" />
                      {teacher.qualification || dict.common.notSet}
                    </dd>
                  </div>
                </>
              )}
              {student && (
                <>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-500">{dict.profilePage.enrollmentNumber}</dt>
                    <dd className="mt-1.5 text-sm text-slate-700 dark:text-navy-100">{student.enrollment_number}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-500">{dict.profilePage.class}</dt>
                    <dd className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-700 dark:text-navy-100">
                      <School className="h-3.5 w-3.5 text-slate-400 dark:text-navy-500" />
                      {className || dict.common.notAssigned}
                    </dd>
                  </div>
                  {(student.emergency_contact_name || student.emergency_contact_phone) && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-500">{dict.emergencyContact.title}</dt>
                      <dd className="mt-1.5 text-sm text-slate-700 dark:text-navy-100">
                        {student.emergency_contact_name}
                        {student.emergency_contact_relationship && ` (${student.emergency_contact_relationship})`}
                        {student.emergency_contact_phone && <span className="block text-xs text-slate-500 dark:text-navy-400">{student.emergency_contact_phone}</span>}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </Card>
        </FadeUp>
      )}
    </div>
  );
}
