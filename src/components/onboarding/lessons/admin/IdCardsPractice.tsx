"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { FakePeople, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guidance, LinkButton, at } from "./common";

const T = {
  en: {
    title: "Student ID Cards",
    subtitle: "View or download an ID card for any student.",
    search: "Search by name",
    none: "No students found.",
    gradeClass: "Grade / Class",
    studentId: "Student ID",
    view: "View ID card",
    back: "Back to list",
    cardLabel: "STUDENT ID CARD",
    photo: "Photo",
    changePhoto: "Change photo",
    photoNote: "Practice: the real button opens a file picker (PNG, up to 4 MB). The photo you pick also becomes the student's profile picture everywhere in the app.",
    downloadPdf: "Download PDF",
    saveImage: "Save as Image",
    downloaded: "Practice: a real file would download now.",
    help: "The photo above is used for this ID card. Changing it here updates the same photo shown throughout the app.",
    guideOpen: "Press View ID card on any student.",
    guideDownload: "Press Download PDF or Save as Image under the card.",
  },
  ar: {
    title: "بطاقات هوية الطلاب",
    subtitle: "اعرض أو نزّل بطاقة هوية أي طالب.",
    search: "البحث بالاسم",
    none: "لم يتم العثور على طلاب.",
    gradeClass: "الصف / الفصل",
    studentId: "رقم الطالب",
    view: "عرض بطاقة الهوية",
    back: "العودة إلى القائمة",
    cardLabel: "بطاقة هوية الطالب",
    photo: "الصورة",
    changePhoto: "تغيير الصورة",
    photoNote: "تدريب: الزر الحقيقي يفتح نافذة اختيار ملف (PNG بحد أقصى 4 ميغابايت). الصورة التي تختارها تصبح أيضًا صورة الطالب الشخصية في كل أنحاء التطبيق.",
    downloadPdf: "تنزيل PDF",
    saveImage: "حفظ كصورة",
    downloaded: "تدريب: في الواقع سيبدأ تنزيل ملف الآن.",
    help: "الصورة أعلاه هي المستخدمة في بطاقة الهوية. تغييرها من هنا يحدّث الصورة نفسها المعروضة في كل أنحاء التطبيق.",
    guideOpen: "اضغط «عرض بطاقة الهوية» عند أي طالب.",
    guideDownload: "اضغط «تنزيل PDF» أو «حفظ كصورة» أسفل البطاقة.",
  },
};

export default function IdCardsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const t = T[locale];
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showPhotoNote, setShowPhotoNote] = useState(false);
  const { toast, show } = useFakeToast();

  const students = FakePeople.students.filter((s) => s[locale].toLowerCase().includes(query.trim().toLowerCase()));
  const open = FakePeople.students.find((s) => s.id === openId);

  if (open) {
    const idx = FakePeople.students.indexOf(open);
    return (
      <PracticeFrame locale={locale} dir={dir} title={t.title}>
        <LinkButton
          onClick={() => {
            setOpenId(null);
            setShowPhotoNote(false);
          }}
        >
          {t.back}
        </LinkButton>
        <Guidance level={level}>{t.guideDownload}</Guidance>
        {toast}
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-navy-900 bg-navy-950 text-white shadow-sm">
          <div className="border-b-2 border-gold-500 px-4 py-3 text-xs font-semibold tracking-wide">{t.cardLabel}</div>
          <div className="flex items-center gap-4 p-4">
            <div
              aria-label={t.photo}
              className="flex h-20 w-16 shrink-0 items-center justify-center rounded-md bg-navy-800 text-lg font-semibold text-gold-300"
            >
              {open[locale].charAt(0)}
            </div>
            <dl className="min-w-0 space-y-1 text-sm">
              <dd className="truncate text-base font-semibold">{open[locale]}</dd>
              <div>
                <dt className="text-xs text-navy-200">{t.gradeClass}</dt>
                <dd>{at(FakePeople.classes, idx % 2)[locale]}</dd>
              </div>
              <div>
                <dt className="text-xs text-navy-200">{t.studentId}</dt>
                <dd>
                  <bdi dir="ltr">PRAC-{1000 + idx}</bdi>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              show(t.downloaded, "info");
              completeTask("download-card");
            }}
          >
            {t.downloadPdf}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              show(t.downloaded, "info");
              completeTask("download-card");
            }}
          >
            {t.saveImage}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowPhotoNote(true)}>
            {t.changePhoto}
          </Button>
        </div>
        {showPhotoNote && <p className="text-sm text-slate-600 dark:text-navy-200">{t.photoNote}</p>}
        <p className="text-sm text-slate-500 dark:text-navy-400">{t.help}</p>
      </PracticeFrame>
    );
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={t.title} description={t.subtitle}>
      <Guidance level={level}>{t.guideOpen}</Guidance>
      <Input label={t.search} name="practice-idc-search" value={query} onChange={(e) => setQuery(e.target.value)} />
      {students.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-navy-400">{t.none}</p>
      ) : (
        <ul className="card divide-y divide-slate-100 dark:divide-navy-800">
          {students.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-semibold text-navy-800 dark:bg-navy-800 dark:text-navy-100" aria-hidden="true">
                  {s[locale].charAt(0)}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{s[locale]}</p>
                  <p className="text-xs text-slate-500 dark:text-navy-400">
                    {t.gradeClass}: {at(FakePeople.classes, FakePeople.students.indexOf(s) % 2)[locale]} · {t.studentId}: <bdi dir="ltr">PRAC-{1000 + FakePeople.students.indexOf(s)}</bdi>
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setOpenId(s.id);
                  completeTask("open-card");
                }}
              >
                {t.view}
                <span className="sr-only"> {s[locale]}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </PracticeFrame>
  );
}
