"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createAdmissionAction, type ActionState } from "../actions";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
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

export function AdmissionForm({ dict }: { dict: Dictionary }) {
  const [state, formAction] = useActionState(createAdmissionAction, initialState);
  const [center, setCenter] = useState<"AKIS" | "AKET">("AKIS");

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Select label={dict.admissions.chooseCenter} name="center" value={center} onChange={(e) => setCenter(e.target.value as "AKIS" | "AKET")}>
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
