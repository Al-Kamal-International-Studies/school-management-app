"use client";

import { useActionState } from "react";
import { ActionForm, useFormStatus } from "@/components/ui/ActionForm";
import { createAdmissionAction, updateAdmissionAction, type ActionState } from "../actions";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AKIS_CENTER_ID, type Admission, type ClassRow } from "@/lib/types/database.types";
import type { Dictionary } from "@/lib/i18n/types";

const initialState: ActionState = {};

const CHECKBOX_CLASS =
  "h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-400 dark:border-navy-600 dark:bg-navy-900 dark:focus:ring-navy-300";

function SubmitButton({ dict, editing }: { dict: Dictionary; editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (editing ? dict.admissions.savingChanges : dict.admissions.submitting) : editing ? dict.admissions.saveChanges : dict.admissions.submit}
    </Button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-navy-700 dark:bg-navy-800/60">
      <h3 className="text-sm font-semibold text-navy-900 dark:text-white">{title}</h3>
      {children}
    </div>
  );
}

function CheckboxField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-navy-200">
      <input type="checkbox" name={name} className={CHECKBOX_CLASS} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

export function AdmissionForm({
  dict,
  classes,
  admission,
}: {
  dict: Dictionary;
  classes: Pick<ClassRow, "id" | "name" | "section" | "center_id">[];
  /** Present only in edit mode (see (dashboard)/admin/admissions/[id]/edit/page.tsx)
   * — pre-fills every field with the admission's currently-saved data and
   * submits to updateAdmissionAction instead of createAdmissionAction. */
  admission?: Admission;
}) {
  const editing = admission !== undefined;
  const boundUpdateAction = editing ? updateAdmissionAction.bind(null, admission.id) : null;
  const [state, formAction] = useActionState(boundUpdateAction ?? createAdmissionAction, initialState);
  // Single institution (AKIS, HANDOVER Part 37): only AKIS classes are offered.
  const classesForCenter = classes.filter((c) => c.center_id === AKIS_CENTER_ID);

  return (
    <ActionForm action={formAction} state={state} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {editing && <Alert tone="info">{dict.admissions.editScopeNote}</Alert>}

      <SectionCard title={dict.admissions.sectionStudent}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={dict.admissions.studentFullName} name="student_full_name" defaultValue={admission?.student_full_name} required />
          <Select label={dict.admissions.studentGender} name="student_gender" defaultValue={admission?.student_gender ?? "male"}>
            <option value="male">{dict.admissions.genderMale}</option>
            <option value="female">{dict.admissions.genderFemale}</option>
          </Select>
          <Input label={dict.admissions.studentDob} name="student_dob" type="date" defaultValue={admission?.student_dob ?? undefined} />
          <Input label={dict.admissions.studentIdNumber} name="student_id_number" defaultValue={admission?.student_id_number ?? undefined} />
          <Input label={dict.admissions.studentReligion} name="student_religion" defaultValue={admission?.student_religion ?? undefined} />
          <Input label={dict.admissions.studentNationality} name="student_nationality" defaultValue={admission?.student_nationality ?? undefined} />
          <Select label={dict.admissions.enrolmentClass} name="enrolment_class_id" defaultValue={admission?.enrolment_class_id ?? ""}>
            <option value="">{dict.admissions.enrolmentClassUnassigned}</option>
            {classesForCenter.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.section}
              </option>
            ))}
          </Select>
        </div>
      </SectionCard>

      <SectionCard title={dict.admissions.sectionFather}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={dict.admissions.parentName} name="father_name" defaultValue={admission?.father_name ?? undefined} />
          <Input label={dict.admissions.parentJobTitle} name="father_job_title" defaultValue={admission?.father_job_title ?? undefined} />
          <Input label={dict.admissions.parentMobile} name="father_mobile" defaultValue={admission?.father_mobile ?? undefined} />
          <Input
            label={dict.admissions.parentEmail}
            name="father_email"
            type="email"
            defaultValue={admission?.father_email ?? undefined}
            hint={dict.admissions.parentEmailHint}
          />
          <Input label={dict.admissions.parentNationality} name="father_nationality" defaultValue={admission?.father_nationality ?? undefined} />
        </div>
      </SectionCard>

      <SectionCard title={dict.admissions.sectionMother}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={dict.admissions.parentName} name="mother_name" defaultValue={admission?.mother_name ?? undefined} />
          <Input label={dict.admissions.parentJobTitle} name="mother_job_title" defaultValue={admission?.mother_job_title ?? undefined} />
          <Input label={dict.admissions.parentMobile} name="mother_mobile" defaultValue={admission?.mother_mobile ?? undefined} />
          <Input label={dict.admissions.parentEmail} name="mother_email" type="email" defaultValue={admission?.mother_email ?? undefined} />
          <Input label={dict.admissions.parentNationality} name="mother_nationality" defaultValue={admission?.mother_nationality ?? undefined} />
        </div>
      </SectionCard>

      <SectionCard title={dict.admissions.sectionAddress}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={dict.admissions.addressEmirate} name="address_emirate" defaultValue={admission?.address_emirate ?? undefined} />
          <Input label={dict.admissions.addressArea} name="address_area" defaultValue={admission?.address_area ?? undefined} />
          <Input label={dict.admissions.addressStreet} name="address_street" defaultValue={admission?.address_street ?? undefined} />
          <Input label={dict.admissions.addressBuilding} name="address_building" defaultValue={admission?.address_building ?? undefined} />
        </div>
      </SectionCard>

      <SectionCard title={dict.admissions.sectionMedical}>
        <Textarea label={dict.admissions.medicalConditionsLabel} name="medical_conditions" rows={3} defaultValue={admission?.medical_conditions ?? undefined} />
        <div>
          <p className="label mb-2">{dict.admissions.medicalDifficulties}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <CheckboxField name="medical_vision" label={dict.admissions.medicalVision} defaultChecked={admission?.medical_vision} />
            <CheckboxField name="medical_motor" label={dict.admissions.medicalMotor} defaultChecked={admission?.medical_motor} />
            <CheckboxField name="medical_hearing" label={dict.admissions.medicalHearing} defaultChecked={admission?.medical_hearing} />
            <CheckboxField name="medical_balance" label={dict.admissions.medicalBalance} defaultChecked={admission?.medical_balance} />
            <CheckboxField name="medical_speech" label={dict.admissions.medicalSpeech} defaultChecked={admission?.medical_speech} />
          </div>
        </div>
        <CheckboxField name="medical_allergies" label={dict.admissions.medicalAllergiesQuestion} defaultChecked={admission?.medical_allergies} />
        <Input label={dict.admissions.medicalAllergiesDetail} name="medical_allergies_detail" defaultValue={admission?.medical_allergies_detail ?? undefined} />
      </SectionCard>

      <SectionCard title={dict.admissions.sectionConsent}>
        <CheckboxField name="consent_accepted" label={dict.admissions.consentAccepted} defaultChecked={admission?.consent_accepted} />
      </SectionCard>

      <SectionCard title={dict.admissions.sectionPayment}>
        <CheckboxField name="payment_policy_accepted" label={dict.admissions.paymentPolicyAccepted} defaultChecked={admission?.payment_policy_accepted} />
      </SectionCard>

      <SectionCard title={dict.admissions.sectionAdditional}>
        <CheckboxField
          name="additional_policies_accepted"
          label={dict.admissions.additionalPoliciesAccepted}
          defaultChecked={admission?.additional_policies_accepted ?? undefined}
        />
      </SectionCard>

      <Input label={dict.admissions.enrolmentGrade} name="enrolment_grade" defaultValue={admission?.enrolment_grade ?? undefined} />

      <SubmitButton dict={dict} editing={editing} />
    </ActionForm>
  );
}
