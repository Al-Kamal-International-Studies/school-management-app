import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAdmission } from "../queries";
import { DownloadPdfButton } from "./DownloadPdfButton";
import { RetryButton } from "./RetryButton";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { FadeUp } from "@/components/motion/FadeUp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { AKIS_CENTER_ID, type AdmissionStatus } from "@/lib/types/database.types";

const STATUS_TONE: Record<AdmissionStatus, "green" | "red" | "amber"> = {
  processed: "green",
  failed: "red",
  pending: "amber",
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-navy-400">{label}</p>
      <p className="text-sm text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export default async function AdmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const admission = await getAdmission(id);
  if (!admission) notFound();
  const dict = await getDictionary(await getLocale());

  const supabase = await createClient();
  const linkedIds = [admission.student_profile_id, admission.parent_profile_id].filter((v): v is string => Boolean(v));
  const [{ data: creator }, { data: linkedProfiles }] = await Promise.all([
    admission.created_by ? supabase.from("profiles").select("full_name, email").eq("id", admission.created_by).single() : Promise.resolve({ data: null }),
    linkedIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email, role").in("id", linkedIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; email: string; role: string }[] }),
  ]);

  const studentProfile = linkedProfiles?.find((p) => p.id === admission.student_profile_id) ?? null;
  const parentProfile = linkedProfiles?.find((p) => p.id === admission.parent_profile_id) ?? null;
  const centerShortCode = admission.center_id === AKIS_CENTER_ID ? "AKIS" : "AKET";

  const statusLabel: Record<AdmissionStatus, string> = {
    pending: dict.admissions.statusPending,
    processed: dict.admissions.statusProcessed,
    failed: dict.admissions.statusFailed,
  };

  return (
    <div className="max-w-3xl space-y-6">
      <FadeUp className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-white">{admission.student_full_name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-400">
            {centerShortCode} · {new Date(admission.registration_date).toLocaleDateString()}
          </p>
        </div>
        <Badge tone={STATUS_TONE[admission.status]}>{statusLabel[admission.status]}</Badge>
      </FadeUp>

      {admission.status === "failed" && admission.error && (
        <FadeUp delay={0.02}>
          <Alert tone="error">
            <strong>{dict.admissions.processingError}:</strong> {admission.error}
          </Alert>
        </FadeUp>
      )}

      <FadeUp delay={0.04} className="card flex flex-wrap items-center gap-3 p-6">
        {admission.pdf_file_path && <DownloadPdfButton admissionId={admission.id} dict={dict} />}
        {admission.status === "failed" && <RetryButton admissionId={admission.id} dict={dict} />}
      </FadeUp>

      <FadeUp delay={0.06} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.sectionStudent}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={dict.admissions.studentFullName} value={admission.student_full_name} />
          <Field label={dict.admissions.studentGender} value={admission.student_gender === "male" ? dict.admissions.genderMale : dict.admissions.genderFemale} />
          <Field label={dict.admissions.studentDob} value={admission.student_dob} />
          <Field label={dict.admissions.studentIdNumber} value={admission.student_id_number} />
          <Field label={dict.admissions.studentReligion} value={admission.student_religion} />
          <Field label={dict.admissions.studentNationality} value={admission.student_nationality} />
          {admission.enrolment_grade && <Field label={dict.admissions.enrolmentGrade} value={admission.enrolment_grade} />}
          {admission.package_name && <Field label={dict.admissions.packageName} value={admission.package_name} />}
        </div>
      </FadeUp>

      <FadeUp delay={0.08} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.sectionFather}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={dict.admissions.parentName} value={admission.father_name} />
          <Field label={dict.admissions.parentJobTitle} value={admission.father_job_title} />
          <Field label={dict.admissions.parentMobile} value={admission.father_mobile} />
          <Field label={dict.admissions.parentEmail} value={admission.father_email} />
          <Field label={dict.admissions.parentNationality} value={admission.father_nationality} />
        </div>
        <h2 className="pt-2 text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.sectionMother}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={dict.admissions.parentName} value={admission.mother_name} />
          <Field label={dict.admissions.parentJobTitle} value={admission.mother_job_title} />
          <Field label={dict.admissions.parentMobile} value={admission.mother_mobile} />
          <Field label={dict.admissions.parentEmail} value={admission.mother_email} />
          <Field label={dict.admissions.parentNationality} value={admission.mother_nationality} />
        </div>
      </FadeUp>

      <FadeUp delay={0.1} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.sectionAddress}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={dict.admissions.addressEmirate} value={admission.address_emirate} />
          <Field label={dict.admissions.addressArea} value={admission.address_area} />
          <Field label={dict.admissions.addressStreet} value={admission.address_street} />
          <Field label={dict.admissions.addressBuilding} value={admission.address_building} />
        </div>
      </FadeUp>

      <FadeUp delay={0.12} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.sectionMedical}</h2>
        <Field label={dict.admissions.medicalConditionsLabel} value={admission.medical_conditions} />
        <div className="flex flex-wrap gap-2">
          {admission.medical_vision && <Badge>{dict.admissions.medicalVision}</Badge>}
          {admission.medical_motor && <Badge>{dict.admissions.medicalMotor}</Badge>}
          {admission.medical_hearing && <Badge>{dict.admissions.medicalHearing}</Badge>}
          {admission.medical_balance && <Badge>{dict.admissions.medicalBalance}</Badge>}
          {admission.medical_speech && <Badge>{dict.admissions.medicalSpeech}</Badge>}
        </div>
        <Field label={dict.admissions.medicalAllergiesQuestion} value={admission.medical_allergies ? dict.common.yes : dict.common.no} />
        <Field label={dict.admissions.medicalAllergiesDetail} value={admission.medical_allergies_detail} />
      </FadeUp>

      <FadeUp delay={0.14} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.studentAccount}</h2>
        {studentProfile ? (
          <Link href={`/admin/users/${studentProfile.id}`} className="text-sm font-medium text-navy-600 hover:text-navy-800 dark:text-gold-300 dark:hover:text-gold-200">
            {studentProfile.full_name} — {studentProfile.email}
          </Link>
        ) : (
          <p className="text-sm text-slate-500 dark:text-navy-400">{dict.admissions.notYetLinked}</p>
        )}

        <h2 className="pt-2 text-sm font-semibold text-slate-700 dark:text-navy-100">{dict.admissions.parentAccount}</h2>
        {parentProfile ? (
          <Link href={`/admin/users/${parentProfile.id}`} className="text-sm font-medium text-navy-600 hover:text-navy-800 dark:text-gold-300 dark:hover:text-gold-200">
            {parentProfile.full_name} — {parentProfile.email}
          </Link>
        ) : (
          <p className="text-sm text-slate-500 dark:text-navy-400">{dict.admissions.notYetLinked}</p>
        )}

        <Field label={dict.admissions.createdBy} value={creator?.full_name ? `${creator.full_name} (${creator.email})` : null} />
        <Field label={dict.admissions.registrationDate} value={new Date(admission.registration_date).toLocaleDateString()} />
      </FadeUp>
    </div>
  );
}
