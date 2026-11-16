"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { FakePeople, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import type { OnboardingLocale, PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, NativeSelect, ResponsiveTable, at } from "./common";

type Role = "teacher" | "student" | "parent";

interface Row {
  id: string;
  name: { en: string; ar: string };
  email: string;
  role: Role;
  detail: string;
  active: boolean;
  locked?: boolean;
}

const T = {
  en: {
    title: "Users",
    subtitle: "Manage teacher and student accounts.",
    add: "Add user",
    back: "Back to the list",
    search: "Search by name or email",
    roleFilter: "Role",
    all: "All",
    roles: { teacher: "Teacher", student: "Student", parent: "Parent" },
    head: ["Name", "Email", "Role", "Details", "Status", ""],
    active: "Active",
    deactivated: "Deactivated",
    activate: "Activate",
    deactivate: "Deactivate",
    none: "No users found",
    scenario: "Scenario: Yusuf typed his password wrongly three times, so his account was locked. It shows as Deactivated.",
    adminNote: "Locked admin accounts can't be reactivated here. Admin accounts are not listed on this page.",
    formTitle: "Add user",
    formSubtitle: "Create a teacher, student, or parent account. They'll sign in with the email and password you set here.",
    role: "Role",
    fullName: "Full name",
    phone: "Phone (optional)",
    email: "Email",
    password: "Temporary password",
    passwordHint: "At least 12 characters. Share this with them securely — they can change it after signing in.",
    employeeId: "Employee ID",
    qualification: "Qualification (optional)",
    enrollment: "Enrollment number",
    classOpt: "Class (optional)",
    unassigned: "Unassigned",
    dob: "Date of birth (optional)",
    children: "Children (hold Ctrl/Cmd to select multiple)",
    childrenHint: "More children can be linked later from this account's page.",
    create: "Create account",
    errShort: "Password must be at least 12 characters.",
    errCommon: "That password is too common - choose something less guessable.",
    errEmployee: "Employee ID is required for teachers.",
    errEnrollment: "Enrollment number is required for students.",
    errEmployeeUsed: "That employee ID is already in use.",
    errEnrollmentUsed: "That enrollment number is already in use.",
    created: (n: string) => `Account created for ${n}. It now appears in the list.`,
    reactivated: (n: string) => `${n} is active again. The failed sign-in count is cleared, so they can sign in.`,
    deactivatedMsg: (n: string) => `${n} is deactivated and can't sign in.`,
    guideCreate: "Pick Teacher, fill in the name, an email, a password of 12 or more characters and an Employee ID, then press Create account.",
    guideReactivate: "Find Yusuf Example in the list. His status says Deactivated. Press Activate on his row.",
  },
  ar: {
    title: "المستخدمون",
    subtitle: "إدارة حسابات المعلمين والطلاب.",
    add: "إضافة مستخدم",
    back: "العودة إلى القائمة",
    search: "البحث بالاسم أو البريد الإلكتروني",
    roleFilter: "الدور",
    all: "الكل",
    roles: { teacher: "معلم", student: "طالب", parent: "ولي أمر" },
    head: ["الاسم", "البريد الإلكتروني", "الدور", "التفاصيل", "الحالة", ""],
    active: "نشط",
    deactivated: "موقوف",
    activate: "تفعيل",
    deactivate: "إيقاف",
    none: "لم يتم العثور على مستخدمين",
    scenario: "السيناريو: أدخل يوسف كلمة مروره بشكل خاطئ ثلاث مرات، فتم قفل حسابه. يظهر الآن بحالة «موقوف».",
    adminNote: "لا يمكن إعادة تفعيل حسابات المسؤولين المقفلة من هنا. حسابات المسؤولين غير معروضة في هذه الصفحة.",
    formTitle: "إضافة مستخدم",
    formSubtitle: "إنشاء حساب معلم أو طالب أو ولي أمر. سيسجلون الدخول بالبريد الإلكتروني وكلمة المرور التي تحددها هنا.",
    role: "الدور",
    fullName: "الاسم الكامل",
    phone: "الهاتف (اختياري)",
    email: "البريد الإلكتروني",
    password: "كلمة المرور المؤقتة",
    passwordHint: "12 حرفًا على الأقل. شاركها معهم بشكل آمن — يمكنهم تغييرها بعد تسجيل الدخول.",
    employeeId: "الرقم الوظيفي",
    qualification: "المؤهل (اختياري)",
    enrollment: "رقم القيد",
    classOpt: "الفصل (اختياري)",
    unassigned: "غير مُعيَّن",
    dob: "تاريخ الميلاد (اختياري)",
    children: "الأبناء (اضغط مع الاستمرار على Ctrl/Cmd للاختيار المتعدد)",
    childrenHint: "يمكن ربط المزيد من الأبناء لاحقًا من صفحة هذا الحساب.",
    create: "إنشاء الحساب",
    errShort: "يجب ألا تقل كلمة المرور عن 12 حرفًا.",
    errCommon: "كلمة المرور هذه شائعة جدًا. اختر كلمة يصعب تخمينها.",
    errEmployee: "الرقم الوظيفي مطلوب للمعلمين.",
    errEnrollment: "رقم القيد مطلوب للطلاب.",
    errEmployeeUsed: "هذا الرقم الوظيفي مستخدم بالفعل.",
    errEnrollmentUsed: "رقم القيد هذا مستخدم بالفعل.",
    created: (n: string) => `تم إنشاء حساب ${n}. يظهر الآن في القائمة.`,
    reactivated: (n: string) => `تمت إعادة تفعيل حساب ${n}. صُفّر عدد محاولات الدخول الفاشلة، فيمكنه تسجيل الدخول.`,
    deactivatedMsg: (n: string) => `حساب ${n} موقوف ولا يمكنه تسجيل الدخول.`,
    guideCreate: "اختر «معلم»، واكتب الاسم والبريد الإلكتروني وكلمة مرور من 12 حرفًا أو أكثر والرقم الوظيفي، ثم اضغط «إنشاء الحساب».",
    guideReactivate: "ابحث عن يوسف مثال في القائمة. حالته «موقوف». اضغط «تفعيل» في صفّه.",
  },
};

const COMMON = ["password1234", "123456789012", "qwertyuiop12", "passwordpassword"];

const INITIAL: Row[] = [
  { id: "u1", name: at(FakePeople.teachers, 1), email: "teacher.two@practice.example", role: "teacher", detail: "EMP-102", active: true },
  { id: "u2", name: at(FakePeople.students, 0), email: "omar@practice.example", role: "student", detail: "ENR-2001", active: true },
  { id: "u3", name: at(FakePeople.students, 2), email: "yusuf@practice.example", role: "student", detail: "ENR-2003", active: false, locked: true },
  { id: "u4", name: at(FakePeople.parents, 0), email: "mr.sample@practice.example", role: "parent", detail: "-", active: true },
];

function nameOf(r: Row, locale: OnboardingLocale) {
  return r.name[locale];
}

export default function UsersPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [rows, setRows] = useState<Row[]>(INITIAL);
  const [view, setView] = useState<"list" | "new">("list");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const { toast, show } = useFakeToast(6000);

  const [role, setRole] = useState<Role>("teacher");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [qualification, setQualification] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [classId, setClassId] = useState("");
  const [dob, setDob] = useState("");
  const [children, setChildren] = useState<string[]>([]);
  const [error, setError] = useState<{ field: string; text: string } | null>(null);

  function resetForm() {
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setEmployeeId("");
    setQualification("");
    setEnrollment("");
    setClassId("");
    setDob("");
    setChildren([]);
    setError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 12) return setError({ field: "password", text: t.errShort });
    if (COMMON.includes(password.toLowerCase())) return setError({ field: "password", text: t.errCommon });
    if (role === "teacher") {
      if (!employeeId.trim()) return setError({ field: "employee", text: t.errEmployee });
      if (rows.some((r) => r.detail === employeeId.trim())) return setError({ field: "employee", text: t.errEmployeeUsed });
    }
    if (role === "student") {
      if (!enrollment.trim()) return setError({ field: "enrollment", text: t.errEnrollment });
      if (rows.some((r) => r.detail === enrollment.trim())) return setError({ field: "enrollment", text: t.errEnrollmentUsed });
    }
    const label = { en: fullName.trim(), ar: fullName.trim() };
    const cls = FakePeople.classes.find((c) => c.id === classId);
    const detail = role === "teacher" ? employeeId.trim() : role === "student" ? `${enrollment.trim()}${cls ? ` · ${cls[locale]}` : ""}` : "-";
    setRows((prev) => [{ id: `n${prev.length}`, name: label, email: email.trim(), role, detail, active: true }, ...prev]);
    resetForm();
    setView("list");
    show(t.created(label.en));
    if (role === "teacher") completeTask("create-teacher");
  }

  function toggle(r: Row) {
    const next = !r.active;
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, active: next, locked: next ? false : x.locked } : x)));
    show(next ? t.reactivated(nameOf(r, locale)) : t.deactivatedMsg(nameOf(r, locale)), next ? "success" : "info");
    if (next && r.locked) completeTask("reactivate-locked");
  }

  const shown = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    const matches = !q || nameOf(r, locale).toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    return matches && (roleFilter === "all" || r.role === roleFilter);
  });

  if (view === "new") {
    return (
      <PracticeFrame locale={locale} dir={dir} title={t.formTitle} description={t.formSubtitle}>
        <LinkButton onClick={() => setView("list")}>{t.back}</LinkButton>
        <Guidance level={level}>{t.guideCreate}</Guidance>
        <form onSubmit={submit} className="space-y-4">
          <NativeSelect
            label={t.role}
            name="practice-user-role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role);
              setError(null);
            }}
            options={[
              { value: "student", label: t.roles.student },
              { value: "teacher", label: t.roles.teacher },
              { value: "parent", label: t.roles.parent },
            ]}
          />
          <Input label={t.fullName} name="practice-user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label={t.phone} name="practice-user-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label={t.email} name="practice-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label={t.password}
            name="practice-user-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={t.passwordHint}
            error={error?.field === "password" ? error.text : undefined}
            required
            autoComplete="off"
          />
          {role === "teacher" && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-navy-700 dark:bg-navy-900">
              <Input
                label={t.employeeId}
                name="practice-user-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                error={error?.field === "employee" ? error.text : undefined}
              />
              <Input label={t.qualification} name="practice-user-qualification" value={qualification} onChange={(e) => setQualification(e.target.value)} />
            </div>
          )}
          {role === "student" && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-navy-700 dark:bg-navy-900">
              <Input
                label={t.enrollment}
                name="practice-user-enrollment"
                value={enrollment}
                onChange={(e) => setEnrollment(e.target.value)}
                error={error?.field === "enrollment" ? error.text : undefined}
              />
              <NativeSelect
                label={t.classOpt}
                name="practice-user-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                options={[{ value: "", label: t.unassigned }, ...FakePeople.classes.map((c) => ({ value: c.id, label: c[locale] }))]}
              />
              <Input label={t.dob} name="practice-user-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          )}
          {role === "parent" && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-navy-700 dark:bg-navy-900">
              <NativeSelect
                label={t.children}
                name="practice-user-children"
                multiple
                value={children}
                onChange={(e) => setChildren(Array.from(e.target.selectedOptions).map((o) => o.value))}
                options={FakePeople.students.map((s) => ({ value: s.id, label: s[locale] }))}
                hint={t.childrenHint}
              />
            </div>
          )}
          <Button type="submit">{t.create}</Button>
        </form>
      </PracticeFrame>
    );
  }

  return (
    <PracticeFrame
      locale={locale}
      dir={dir}
      title={t.title}
      description={t.subtitle}
      action={
        <Button
          type="button"
          onClick={() => {
            resetForm();
            setView("new");
          }}
        >
          {t.add}
        </Button>
      }
    >
      {toast}
      <Guidance level={level}>{t.guideReactivate}</Guidance>
      <Alert tone="info">{t.scenario}</Alert>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Input label={t.search} name="practice-users-search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <NativeSelect
          label={t.roleFilter}
          name="practice-users-role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: "all", label: t.all },
            { value: "teacher", label: t.roles.teacher },
            { value: "student", label: t.roles.student },
            { value: "parent", label: t.roles.parent },
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">{t.none}</p>
      ) : (
        <ResponsiveTable
          head={t.head}
          rows={shown.map((r) => ({
            key: r.id,
            cells: [
              <span key="n" className="font-medium text-slate-900 dark:text-white">
                {nameOf(r, locale)}
              </span>,
              <bdi key="e" dir="ltr">
                {r.email}
              </bdi>,
              t.roles[r.role],
              r.detail,
              <Badge key="s" tone={r.active ? "green" : "red"}>
                {r.active ? t.active : t.deactivated}
              </Badge>,
              <LinkButton key="a" onClick={() => toggle(r)} danger={r.active}>
                {r.active ? t.deactivate : t.activate}
                <span className="sr-only"> {nameOf(r, locale)}</span>
              </LinkButton>,
            ],
          }))}
        />
      )}
      <p className="text-sm text-slate-600 dark:text-navy-200">{t.adminNote}</p>
    </PracticeFrame>
  );
}
