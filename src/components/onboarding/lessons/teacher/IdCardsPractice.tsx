"use client";

import { useState } from "react";
import { ArrowLeft, Download, Image as ImageIcon } from "lucide-react";
import { PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import { Button } from "@/components/ui/Button";
import { Table, Tbody, Td, Th, Thead } from "@/components/ui/Table";
import type { PracticeProps } from "@/lib/onboarding/types";
import { Guide, ROSTER, classById, nameOf, pick, studentById } from "./shared";

const TEXT = {
  title: { en: "Student ID Cards", ar: "بطاقات هوية الطلاب" },
  sub: { en: "View or download an ID card for any student in your classes.", ar: "اعرض أو نزّل بطاقة هوية لأي طالب في فصولك." },
  name: { en: "Name", ar: "الاسم" },
  classCol: { en: "Grade / Class", ar: "الصف / الفصل" },
  sid: { en: "Student ID", ar: "رقم الطالب" },
  view: { en: "View ID card", ar: "عرض بطاقة الهوية" },
  back: { en: "Back to the list", ar: "العودة إلى القائمة" },
  pdf: { en: "Download PDF", ar: "تنزيل PDF" },
  image: { en: "Save as Image", ar: "حفظ كصورة" },
  school: { en: "Practice School", ar: "مدرسة التدريب" },
  card: { en: "Student ID card", ar: "بطاقة هوية الطالب" },
  noPhoto: {
    en: "Teachers can view and download a card, but cannot change the photo. There is no change-photo button here.",
    ar: "يستطيع المعلمون عرض البطاقة وتنزيلها، لكن لا يستطيعون تغيير الصورة. ولا يوجد هنا زر لتغيير الصورة.",
  },
  downloaded: {
    en: "In the real app this downloads the file. Nothing is downloaded in practice.",
    ar: "في التطبيق الحقيقي يُنزَّل الملف الآن. لا يُنزَّل شيء في التدريب.",
  },
  guide: {
    en: "The list shows only students from your classes. Open one card, then use Download PDF or Save as Image.",
    ar: "تعرض القائمة طلاب فصولك فقط. افتح بطاقة واحدة، ثم استخدم «تنزيل PDF» أو «حفظ كصورة».",
  },
} as const;

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

const ALL = Object.entries(ROSTER).flatMap(([classId, list]) => list.map((s) => ({ ...s, classId })));

export default function IdCardsPractice({ locale, dir, level, completeTask }: PracticeProps) {
  const L = (k: keyof typeof TEXT) => pick(locale, TEXT[k].en, TEXT[k].ar);
  const { toast, show } = useFakeToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = ALL.find((s) => s.id === openId) ?? null;

  if (open) {
    const name = nameOf(studentById(open.id), locale);
    return (
      <PracticeFrame locale={locale} dir={dir} title={L("title")}>
        <button type="button" onClick={() => setOpenId(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:underline dark:text-navy-200">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {L("back")}
        </button>
        {toast}
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-navy-800 bg-navy-900 text-white">
          <div className="border-b border-gold-500/40 px-5 py-3">
            <p className="text-sm font-semibold">{L("school")}</p>
            <p className="text-xs text-navy-200">{L("card")}</p>
          </div>
          <div className="flex items-center gap-4 px-5 py-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy-700 text-lg font-semibold" aria-hidden="true">{initials(name)}</span>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold">{name}</p>
              <p className="text-sm text-navy-200">{nameOf(classById(open.classId), locale)}</p>
              <p className="text-xs text-navy-300">{L("sid")}: <bdi>{open.enrollment}</bdi></p>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-navy-200">{L("noPhoto")}</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => { show(L("downloaded"), "info"); completeTask("download"); }}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {L("pdf")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => { show(L("downloaded"), "info"); completeTask("download"); }}>
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            {L("image")}
          </Button>
        </div>
      </PracticeFrame>
    );
  }

  return (
    <PracticeFrame locale={locale} dir={dir} title={L("title")} description={L("sub")}>
      <Guide level={level}>{L("guide")}</Guide>
      <Table>
        <Thead>
          <tr>
            <Th>{L("name")}</Th>
            <Th>{L("classCol")}</Th>
            <Th>{L("sid")}</Th>
            <Th></Th>
          </tr>
        </Thead>
        <Tbody>
          {ALL.map((s) => {
            const name = nameOf(studentById(s.id), locale);
            return (
              <tr key={s.id}>
                <Td className="font-medium text-slate-900 dark:text-white">
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white" aria-hidden="true">{initials(name)}</span>
                    {name}
                  </span>
                </Td>
                <Td>{nameOf(classById(s.classId), locale)}</Td>
                <Td><bdi>{s.enrollment}</bdi></Td>
                <Td>
                  <button
                    type="button"
                    className="whitespace-nowrap text-sm font-medium text-navy-600 hover:text-navy-800 hover:underline dark:text-navy-200 dark:hover:text-white"
                    onClick={() => {
                      setOpenId(s.id);
                      completeTask("open-card");
                    }}
                  >
                    {L("view")}
                    <span className="sr-only"> — {name}</span>
                  </button>
                </Td>
              </tr>
            );
          })}
        </Tbody>
      </Table>
    </PracticeFrame>
  );
}
