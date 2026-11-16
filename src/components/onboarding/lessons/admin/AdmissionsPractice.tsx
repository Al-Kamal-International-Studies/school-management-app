"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Field";
import { FakePeople, PracticeFrame } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, NativeSelect, at } from "./common";

const T = {
  en: {
    title: "New admission",
    subtitle: "Fill out the full registration form below. A PDF, student account, and parent account are created automatically on submit.",
    example: "Fill in example details",
    guide: "The minimum is: the student's name, the gender, one parent email and the three acknowledgements. Everything else can stay empty for this practice.",
    sectionStudent: "Student information",
    studentName: "Student full name",
    gender: "Gender",
    genderChoose: "Choose",
    male: "Male",
    female: "Female",
    dob: "Date of birth",
    nationality: "Nationality",
    sectionFather: "Father's information",
    sectionMother: "Mother's information",
    parentName: "Name",
    parentEmail: "Email",
    parentEmailHint: "At least one parent email is required — the welcome email with both accounts' login details is sent here.",
    sectionMedical: "Medical history",
    medical: "Does your child have any health conditions or take any medications that we need to be aware of?",
    sectionConsent: "Informed consent",
    consent: "I acknowledge and agree to the informed consent terms.",
    sectionPayment: "Payment policy",
    payment: "I acknowledge and agree to the payment policy.",
    sectionAdditional: "Additional policies",
    additional: "I confirm I have read, understood, and agreed to the additional institute policies.",
    enrolGrade: "Enrolment grade",
    enrolClass: "Class placement",
    unplaced: "Not placed yet - assign manually later",
    submit: "Submit admission",
    errName: "Student full name is required.",
    errGender: "Choose the student's gender.",
    errConsent: "The informed consent acknowledgment is required.",
    errPayment: "The payment policy acknowledgment is required.",
    errAdditional: "The additional policies acknowledgment is required.",
    detailTitle: "Admission details",
    status: "Status",
    processed: "Processed",
    failed: "Failed",
    downloadPdf: "Download PDF",
    pdfNote: "Practice: the real button downloads the filled-in PDF.",
    accounts: "Accounts created",
    studentAccount: "Student account",
    parentAccount: "Parent account",
    pendingEmails: "Pending outbound emails",
    pendingNote: "No email provider is configured yet — copy these and relay them to parents manually until a provider is set up.",
    to: "To",
    subject: "Subject",
    message: "Message",
    copy: "Copy",
    copied: "Copied",
    emailSubject: "Welcome to the school: your sign-in details",
    emailBody: "Sign-in details for the student account and the parent account. (Practice text: the real email lists both logins and their temporary passwords.)",
    processingError: "Provide at least one parent email.",
    editFirst: "Edit admission: add a parent email",
    retry: "Retry processing",
    newAnother: "Start another admission",
    afterNote: "Both accounts and the PDF were made in one step, and the welcome email is queued. There is no review or accept step.",
    retryNote: "The record was saved, but no accounts could be made without a parent email. Add one, then retry.",
  },
  ar: {
    title: "قبول جديد",
    subtitle: "املأ نموذج التسجيل الكامل أدناه. يتم إنشاء ملف PDF وحساب الطالب وحساب ولي الأمر تلقائيًا عند الإرسال.",
    example: "تعبئة بيانات تجريبية",
    guide: "الحد الأدنى: اسم الطالب، والجنس، وبريد إلكتروني واحد لأحد الوالدين، والإقرارات الثلاثة. يمكن ترك بقية الحقول فارغة في هذا التدريب.",
    sectionStudent: "معلومات الطالب",
    studentName: "اسم الطالب الكامل",
    gender: "الجنس",
    genderChoose: "اختر",
    male: "ذكر",
    female: "أنثى",
    dob: "تاريخ الميلاد",
    nationality: "الجنسية",
    sectionFather: "معلومات الأب",
    sectionMother: "معلومات الأم",
    parentName: "الاسم",
    parentEmail: "البريد الإلكتروني",
    parentEmailHint: "يلزم بريد إلكتروني واحد على الأقل لأحد الوالدين — تُرسل إليه رسالة الترحيب ببيانات دخول الحسابين.",
    sectionMedical: "التاريخ الطبي",
    medical: "هل يعاني طفلك من أي حالات صحية أو يتناول أي أدوية يجب أن نكون على علم بها؟",
    sectionConsent: "الموافقة المستنيرة",
    consent: "أقرّ وأوافق على شروط الموافقة المستنيرة.",
    sectionPayment: "سياسة الدفع",
    payment: "أقرّ وأوافق على سياسة الدفع.",
    sectionAdditional: "سياسات إضافية",
    additional: "أؤكد أنني قرأت وفهمت ووافقت على الالتزام بالسياسات الإضافية للمعهد.",
    enrolGrade: "الصف الدراسي للتسجيل",
    enrolClass: "توزيع الفصل",
    unplaced: "لم يُحدد بعد — سيتم التعيين يدويًا لاحقًا",
    submit: "إرسال طلب القبول",
    errName: "اسم الطالب الكامل مطلوب.",
    errGender: "اختر جنس الطالب.",
    errConsent: "الإقرار بالموافقة المستنيرة مطلوب.",
    errPayment: "الإقرار بسياسة الدفع مطلوب.",
    errAdditional: "الإقرار بالسياسات الإضافية مطلوب.",
    detailTitle: "تفاصيل القبول",
    status: "الحالة",
    processed: "تمت المعالجة",
    failed: "فشلت",
    downloadPdf: "تنزيل ملف PDF",
    pdfNote: "تدريب: الزر الحقيقي ينزّل ملف PDF المعبّأ.",
    accounts: "الحسابات التي أُنشئت",
    studentAccount: "حساب الطالب",
    parentAccount: "حساب ولي الأمر",
    pendingEmails: "رسائل بريد إلكتروني صادرة معلّقة",
    pendingNote: "لم يتم إعداد مزوّد بريد إلكتروني بعد — انسخ هذه الرسائل وأرسلها لأولياء الأمور يدويًا إلى حين إعداد المزوّد.",
    to: "إلى",
    subject: "الموضوع",
    message: "الرسالة",
    copy: "نسخ",
    copied: "تم النسخ",
    emailSubject: "مرحبًا بكم في المدرسة: بيانات تسجيل الدخول",
    emailBody: "بيانات الدخول لحساب الطالب وحساب ولي الأمر. (نص تدريبي: الرسالة الحقيقية تتضمن بيانات الحسابين وكلمتي المرور المؤقتتين.)",
    processingError: "يرجى إدخال بريد إلكتروني واحد على الأقل لأحد الوالدين.",
    editFirst: "تعديل الطلب: أضف بريدًا إلكترونيًا لولي الأمر",
    retry: "إعادة المحاولة",
    newAnother: "بدء طلب قبول آخر",
    afterNote: "أُنشئ الحسابان وملف PDF في خطوة واحدة، ورسالة الترحيب في قائمة الانتظار. لا توجد مرحلة مراجعة أو قبول.",
    retryNote: "حُفظ السجل، لكن تعذّر إنشاء الحسابين دون بريد إلكتروني لولي الأمر. أضف بريدًا ثم أعد المحاولة.",
  },
};

interface Result {
  studentName: string;
  parentEmail: string;
  status: "processed" | "failed";
}

export default function AdmissionsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [studentName, setStudentName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherEmail, setFatherEmail] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherEmail, setMotherEmail] = useState("");
  const [medical, setMedical] = useState("");
  const [grade, setGrade] = useState("7");
  const [classId, setClassId] = useState("");
  const [ack, setAck] = useState({ consent: false, payment: false, additional: false });
  const [error, setError] = useState<{ field: string; text: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [fixEmail, setFixEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [pdfNote, setPdfNote] = useState(false);

  function fillExample() {
    setStudentName(at(FakePeople.students, 0)[locale]);
    setGender("male");
    setFatherName(at(FakePeople.parents, 0)[locale]);
    setFatherEmail("mr.sample@practice.example");
    setAck({ consent: true, payment: true, additional: true });
    setError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!studentName.trim()) return setError({ field: "name", text: t.errName });
    if (!gender) return setError({ field: "gender", text: t.errGender });
    if (!ack.consent) return setError({ field: "consent", text: t.errConsent });
    if (!ack.payment) return setError({ field: "payment", text: t.errPayment });
    if (!ack.additional) return setError({ field: "additional", text: t.errAdditional });
    setError(null);
    const email = fatherEmail.trim() || motherEmail.trim();
    setResult({ studentName: studentName.trim(), parentEmail: email, status: email ? "processed" : "failed" });
    completeTask("submit-admission");
  }

  function retry() {
    if (!fixEmail.trim()) return;
    setResult((r) => (r ? { ...r, parentEmail: fixEmail.trim(), status: "processed" } : r));
  }

  function reset() {
    setResult(null);
    setStudentName("");
    setGender("");
    setFatherEmail("");
    setMotherEmail("");
    setAck({ consent: false, payment: false, additional: false });
    setFixEmail("");
    setCopied(false);
  }

  if (result) {
    const ok = result.status === "processed";
    return (
      <PracticeFrame locale={locale} dir={dir} title={t.detailTitle}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-navy-300">{t.status}</span>
          <Badge tone={ok ? "green" : "red"}>{ok ? t.processed : t.failed}</Badge>
          <span className="font-medium text-slate-900 dark:text-white">{result.studentName}</span>
        </div>

        {ok ? (
          <>
            <Alert tone="success">{t.afterNote}</Alert>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => setPdfNote(true)}>
                {t.downloadPdf}
              </Button>
              {pdfNote && <span className="text-sm text-slate-600 dark:text-navy-200">{t.pdfNote}</span>}
            </div>
            <Card className="space-y-2 p-4">
              <h4 className="section-title">{t.accounts}</h4>
              <ul className="space-y-1 text-sm text-slate-700 dark:text-navy-100">
                <li>
                  {t.studentAccount}: <bdi dir="ltr">student1@practice.example</bdi>
                </li>
                <li>
                  {t.parentAccount}: <bdi dir="ltr">{result.parentEmail}</bdi>
                </li>
              </ul>
            </Card>
            <Card className="space-y-3 p-4">
              <h4 className="section-title">{t.pendingEmails}</h4>
              <p className="text-sm text-slate-500 dark:text-navy-400">{t.pendingNote}</p>
              <dl className="space-y-1 text-sm text-slate-700 dark:text-navy-100">
                <div>
                  <dt className="inline font-medium">{t.to}: </dt>
                  <dd className="inline">
                    <bdi dir="ltr">{result.parentEmail}</bdi>
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium">{t.subject}: </dt>
                  <dd className="inline">{t.emailSubject}</dd>
                </div>
                <div>
                  <dt className="font-medium">{t.message}</dt>
                  <dd>{t.emailBody}</dd>
                </div>
              </dl>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCopied(true);
                  completeTask("copy-welcome-email");
                }}
              >
                {copied ? t.copied : t.copy}
              </Button>
            </Card>
          </>
        ) : (
          <>
            <Alert tone="error">{t.processingError}</Alert>
            <p className="text-sm text-slate-600 dark:text-navy-200">{t.retryNote}</p>
            <Input label={t.editFirst} name="practice-adm-fix-email" type="email" value={fixEmail} onChange={(e) => setFixEmail(e.target.value)} />
            <Button type="button" onClick={retry}>
              {t.retry}
            </Button>
          </>
        )}
        <LinkButton onClick={reset}>{t.newAnother}</LinkButton>
      </PracticeFrame>
    );
  }

  const ackBox = (key: "consent" | "payment" | "additional", heading: string, text: string) => (
    <div className="space-y-1.5">
      <h4 className="section-title">{heading}</h4>
      <label className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-navy-100">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={ack[key]}
          onChange={(e) => setAck((a) => ({ ...a, [key]: e.target.checked }))}
        />
        <span>{text}</span>
      </label>
      {error?.field === key && <p className="text-xs text-red-600 dark:text-red-400">{error.text}</p>}
    </div>
  );

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>{t.guide}</Guidance>
      <div>
        <LinkButton onClick={fillExample}>{t.example}</LinkButton>
      </div>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <div className="space-y-4">
          <h4 className="section-title">{t.sectionStudent}</h4>
          <Input
            label={t.studentName}
            name="practice-adm-name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            error={error?.field === "name" ? error.text : undefined}
          />
          <NativeSelect
            label={t.gender}
            name="practice-adm-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            error={error?.field === "gender" ? error.text : undefined}
            options={[
              { value: "", label: t.genderChoose },
              { value: "male", label: t.male },
              { value: "female", label: t.female },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t.dob} name="practice-adm-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            <Input label={t.nationality} name="practice-adm-nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="section-title">{t.sectionFather}</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t.parentName} name="practice-adm-father-name" value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
            <Input
              label={t.parentEmail}
              name="practice-adm-father-email"
              type="email"
              value={fatherEmail}
              onChange={(e) => setFatherEmail(e.target.value)}
              hint={t.parentEmailHint}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="section-title">{t.sectionMother}</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t.parentName} name="practice-adm-mother-name" value={motherName} onChange={(e) => setMotherName(e.target.value)} />
            <Input label={t.parentEmail} name="practice-adm-mother-email" type="email" value={motherEmail} onChange={(e) => setMotherEmail(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="section-title">{t.sectionMedical}</h4>
          <Textarea label={t.medical} name="practice-adm-medical" rows={3} value={medical} onChange={(e) => setMedical(e.target.value)} />
        </div>

        {ackBox("consent", t.sectionConsent, t.consent)}
        {ackBox("payment", t.sectionPayment, t.payment)}
        {ackBox("additional", t.sectionAdditional, t.additional)}

        <div className="grid gap-4 sm:grid-cols-2">
          <NativeSelect
            label={t.enrolGrade}
            name="practice-adm-grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            options={["6", "7", "8"].map((g) => ({ value: g, label: locale === "ar" ? `الصف ${g}` : `Grade ${g}` }))}
          />
          <NativeSelect
            label={t.enrolClass}
            name="practice-adm-class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={[{ value: "", label: t.unplaced }, ...FakePeople.classes.map((c) => ({ value: c.id, label: c[locale] }))]}
          />
        </div>

        <Button type="submit">{t.submit}</Button>
      </form>
    </PracticeFrame>
  );
}
