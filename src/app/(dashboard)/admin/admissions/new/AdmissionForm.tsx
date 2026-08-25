"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createAdmissionAction, type ActionState } from "../actions";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AKIS_CENTER_ID, AKET_CENTER_ID, type ClassRow } from "@/lib/types/database.types";
import type { Dictionary } from "@/lib/i18n/types";

const initialState: ActionState = {};

const CHECKBOX_CLASS =
  "h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-400 dark:border-navy-600 dark:bg-navy-900 dark:focus:ring-gold-400";

function SubmitButton({ dict }: { dict: Dictionary }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? dict.admissions.submitting : dict.admissions.submit}
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

function CheckboxField({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-navy-200">
      <input type="checkbox" name={name} className={CHECKBOX_CLASS} />
      {label}
    </label>
  );
}

export function AdmissionForm({
  dict,
  classes,
}: {
  dict: Dictionary;
  classes: Pick<ClassRow, "id" | "name" | "section" | "center_id">[];
}) {
  const [state, formAction] = useActionState(createAdmissionAction, initialState);
  const [center, setCenter] = useState<"AKIS" | "AKET">("AKIS");
  const [isAutistic, setIsAutistic] = useState(false);
  // The full class list (both centers) is fetched once server-side and
  // filtered here by the locally-toggled `center` — same shape as this
  // form's existing center-conditional sections below, just applied to a
  // fetched list instead of a hardcoded block of fields.
  const classesForCenter = classes.filter((c) => c.center_id === (center === "AKIS" ? AKIS_CENTER_ID : AKET_CENTER_ID));

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Select
        label={dict.admissions.chooseCenter}
        name="center"
        value={center}
        onChange={(e) => {
          const next = e.target.value as "AKIS" | "AKET";
          setCenter(next);
          // is_autistic can only ever be true for AKET (DB constraint,
          // 0040_admissions_autism_and_class.sql) — the toggle and its
          // fields are hidden entirely for AKIS below, so reset the state
          // too rather than leaving a stale "checked" value the user can no
          // longer see or uncheck.
          if (next === "AKIS") setIsAutistic(false);
        }}
      >
        <option value="AKIS">{dict.admissions.centerAkis}</option>
        <option value="AKET">{dict.admissions.centerAket}</option>
      </Select>

      <SectionCard title={dict.admissions.sectionStudent}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={dict.admissions.studentFullName} name="student_full_name" required />
          <Select label={dict.admissions.studentGender} name="student_gender" defaultValue="male">
            <option value="male">{dict.admissions.genderMale}</option>
            <option value="female">{dict.admissions.genderFemale}</option>
          </Select>
          <Input label={dict.admissions.studentDob} name="student_dob" type="date" />
          <Input label={dict.admissions.studentIdNumber} name="student_id_number" />
          <Input label={dict.admissions.studentReligion} name="student_religion" />
          <Input label={dict.admissions.studentNationality} name="student_nationality" />
          <Select label={dict.admissions.enrolmentClass} name="enrolment_class_id" defaultValue="">
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
          <Input label={dict.admissions.parentName} name="father_name" />
          <Input label={dict.admissions.parentJobTitle} name="father_job_title" />
          <Input label={dict.admissions.parentMobile} name="father_mobile" />
          <Input label={dict.admissions.parentEmail} name="father_email" type="email" hint={dict.admissions.parentEmailHint} />
          <Input label={dict.admissions.parentNationality} name="father_nationality" />
        </div>
      </SectionCard>

      <SectionCard title={dict.admissions.sectionMother}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={dict.admissions.parentName} name="mother_name" />
          <Input label={dict.admissions.parentJobTitle} name="mother_job_title" />
          <Input label={dict.admissions.parentMobile} name="mother_mobile" />
          <Input label={dict.admissions.parentEmail} name="mother_email" type="email" />
          <Input label={dict.admissions.parentNationality} name="mother_nationality" />
        </div>
      </SectionCard>

      <SectionCard title={dict.admissions.sectionAddress}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={dict.admissions.addressEmirate} name="address_emirate" />
          <Input label={dict.admissions.addressArea} name="address_area" />
          <Input label={dict.admissions.addressStreet} name="address_street" />
          <Input label={dict.admissions.addressBuilding} name="address_building" />
        </div>
      </SectionCard>

      <SectionCard title={dict.admissions.sectionMedical}>
        <Textarea label={dict.admissions.medicalConditionsLabel} name="medical_conditions" rows={3} />
        <div>
          <p className="label mb-2">{dict.admissions.medicalDifficulties}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <CheckboxField name="medical_vision" label={dict.admissions.medicalVision} />
            <CheckboxField name="medical_motor" label={dict.admissions.medicalMotor} />
            <CheckboxField name="medical_hearing" label={dict.admissions.medicalHearing} />
            <CheckboxField name="medical_balance" label={dict.admissions.medicalBalance} />
            <CheckboxField name="medical_speech" label={dict.admissions.medicalSpeech} />
          </div>
        </div>
        <CheckboxField name="medical_allergies" label={dict.admissions.medicalAllergiesQuestion} />
        <Input label={dict.admissions.medicalAllergiesDetail} name="medical_allergies_detail" />
      </SectionCard>

      {/* AKET only (Autism Section is a confirmed AKET-only program, enforced
          at the DB level too — see 0040_admissions_autism_and_class.sql).
          Intentionally NOT asking for a type/severity here — the school
          determines that later via an in-person evaluation with the Autism
          Teacher present; this only captures what a parent can answer on a
          form, to inform that evaluation. */}
      {center === "AKET" && (
        <SectionCard title={dict.admissions.sectionAutism}>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-navy-200">
            <input
              type="checkbox"
              name="is_autistic"
              className={CHECKBOX_CLASS}
              checked={isAutistic}
              onChange={(e) => setIsAutistic(e.target.checked)}
            />
            {dict.admissions.isAutisticQuestion}
          </label>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-navy-400">{dict.admissions.autismSectionHint}</p>

          {isAutistic && (
            <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-navy-700">
              <CheckboxField name="autism_diagnosed_before" label={dict.admissions.autismDiagnosedBefore} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label={dict.admissions.autismDiagnosisDate} name="autism_diagnosis_date" type="date" />
                <Input label={dict.admissions.autismDiagnosedBy} name="autism_diagnosed_by" />
              </div>
              <Textarea label={dict.admissions.autismCurrentSupport} name="autism_current_support" rows={2} hint={dict.admissions.autismCurrentSupportHint} />
              <Textarea
                label={dict.admissions.autismCommunicationAbility}
                name="autism_communication_ability"
                rows={2}
                hint={dict.admissions.autismCommunicationAbilityHint}
              />
              <Textarea label={dict.admissions.autismSensoryNotes} name="autism_sensory_notes" rows={2} hint={dict.admissions.autismSensoryNotesHint} />
              <Textarea label={dict.admissions.autismBehavioralNotes} name="autism_behavioral_notes" rows={2} />
              <Textarea label={dict.admissions.autismParentNotes} name="autism_parent_notes" rows={2} hint={dict.admissions.autismParentNotesHint} />
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard title={dict.admissions.sectionConsent}>
        <CheckboxField name="consent_accepted" label={dict.admissions.consentAccepted} />
      </SectionCard>

      <SectionCard title={dict.admissions.sectionPayment}>
        <CheckboxField name="payment_policy_accepted" label={dict.admissions.paymentPolicyAccepted} />
      </SectionCard>

      {center === "AKIS" && (
        <SectionCard title={dict.admissions.sectionAdditional}>
          <CheckboxField name="additional_policies_accepted" label={dict.admissions.additionalPoliciesAccepted} />
        </SectionCard>
      )}

      {center === "AKIS" ? (
        <Input label={dict.admissions.enrolmentGrade} name="enrolment_grade" />
      ) : (
        <Input label={dict.admissions.packageName} name="package_name" />
      )}

      <SubmitButton dict={dict} />
    </form>
  );
}
