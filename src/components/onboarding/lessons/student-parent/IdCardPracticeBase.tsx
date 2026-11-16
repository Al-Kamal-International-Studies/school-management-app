"use client";

import { useState } from "react";
import { Camera, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FakePeople, PracticeFrame, useFakeToast } from "@/components/onboarding/practice/kit";
import { cn } from "@/lib/utils";
import type { PracticeProps } from "@/lib/onboarding/types";
import { FakeIdCard, Guide, tr } from "./shared";

const CHILDREN = [
  { id: "s1", cls: FakePeople.classes[0]!, number: "2101", birth: { en: "12 Apr 2013", ar: "12 أبريل 2013" } },
  { id: "s2", cls: FakePeople.classes[1]!, number: "2102", birth: { en: "03 Sep 2012", ar: "03 سبتمبر 2012" } },
];

/**
 * The ID card page for the student and parent practice screens. A student sees
 * only their own card; a parent can switch between two made-up children.
 */
export default function IdCardPracticeBase({
  role,
  locale,
  dir,
  level,
  completedTasks,
  completeTask,
}: PracticeProps & { role: "student" | "parent" }) {
  const isParent = role === "parent";
  const kids = isParent ? CHILDREN : CHILDREN.slice(0, 1);
  const [activeId, setActiveId] = useState(kids[0]!.id);
  const [photos, setPhotos] = useState<Record<string, boolean>>({});
  const [picking, setPicking] = useState(false);
  const { toast, show } = useFakeToast(6000);

  const student = FakePeople.students.find((s) => s.id === activeId)!;
  const kid = kids.find((k) => k.id === activeId)!;
  const studentName = FakePeople.name(student, locale);
  const hasPhoto = photos[activeId] === true;

  function choose(id: string) {
    setActiveId(id);
    setPicking(false);
    if (id === "s2") completeTask("switch");
  }

  function usePhoto() {
    setPhotos((p) => ({ ...p, [activeId]: true }));
    setPicking(false);
    if (!isParent) completeTask("photo");
    show(tr(locale, "Photo updated. It is used on the card and across the app.", "تم تحديث الصورة. تُستخدم على البطاقة وفي كل أنحاء التطبيق."));
  }

  function save(kind: "pdf" | "image") {
    completeTask(kind);
    show(
      kind === "pdf"
        ? tr(locale, "Practice only. In the real app this saves your ID card as a PDF file.", "للتدريب فقط. في التطبيق الحقيقي يحفظ هذا بطاقة الهوية كملف PDF.")
        : tr(locale, "Practice only. In the real app this saves your ID card as a picture.", "للتدريب فقط. في التطبيق الحقيقي يحفظ هذا بطاقة الهوية كصورة."),
      "info",
    );
  }

  const steps = isParent
    ? [
        { id: "switch", text: tr(locale, "Press Lina Sample at the top to show her card.", "اضغط «لينا نموذج» في الأعلى لعرض بطاقتها.") },
        { id: "pdf", text: tr(locale, "Press Download PDF.", "اضغط «تنزيل PDF».") },
        { id: "image", text: tr(locale, "Press Save as Image.", "اضغط «حفظ كصورة».") },
      ]
    : [
        { id: "photo", text: tr(locale, "Press Choose a photo, then use the sample photo.", "اضغط «اختيار صورة» ثم استخدم الصورة التجريبية.") },
        { id: "pdf", text: tr(locale, "Press Download PDF.", "اضغط «تنزيل PDF».") },
        { id: "image", text: tr(locale, "Press Save as Image.", "اضغط «حفظ كصورة».") },
      ];

  return (
    <PracticeFrame
      locale={locale}
      dir={dir}
      title={tr(locale, "Student ID Card", "بطاقة هوية الطالب")}
      description={
        isParent
          ? tr(locale, "Your child's official school ID — view it here or download a copy anytime.", "بطاقة الهوية المدرسية الرسمية لطفلك — اعرضها هنا أو نزّل نسخة في أي وقت.")
          : tr(locale, "Your official school ID — view it here or download a copy to your device anytime.", "بطاقة هويتك المدرسية الرسمية — اعرضها هنا أو نزّل نسخة إلى جهازك في أي وقت.")
      }
      action={
        isParent ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label={tr(locale, "My Children", "أبنائي")}>
            {kids.map((k) => {
              const s = FakePeople.students.find((x) => x.id === k.id)!;
              const selected = k.id === activeId;
              const label = FakePeople.name(s, locale);
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => choose(k.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500",
                    selected
                      ? "bg-navy-800 text-white dark:bg-navy-600"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700",
                  )}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]" aria-hidden="true">
                    {label.charAt(0)}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        ) : undefined
      }
    >
      {toast}
      <Guide level={level} locale={locale} completed={completedTasks} steps={steps} />

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <FakeIdCard
          locale={locale}
          name={studentName}
          className={FakePeople.name(kid.cls, locale)}
          studentNumber={kid.number}
          birth={kid.birth[locale]}
          year="2026 – 2027"
          hasPhoto={hasPhoto}
        />
        <div className="flex w-full max-w-[480px] flex-col items-stretch gap-4 sm:w-auto sm:max-w-none sm:items-start">
          <div className="flex flex-col items-start">
            <p className="mb-2 text-xs font-medium text-slate-500 dark:text-navy-400">{tr(locale, "Photo", "الصورة")}</p>
            {picking ? (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-navy-700 dark:bg-navy-900">
                <p className="text-slate-600 dark:text-navy-200">
                  {tr(
                    locale,
                    "In the real app you pick a picture from your device (up to 4 MB) and crop it. Here, use the sample photo.",
                    "في التطبيق الحقيقي تختار صورة من جهازك (حتى 4 ميغابايت) وتقصّها. هنا استخدم الصورة التجريبية.",
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={usePhoto}>
                    {tr(locale, "Use the sample photo", "استخدام الصورة التجريبية")}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setPicking(false)}>
                    {tr(locale, "Cancel", "إلغاء")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setPicking(true)}>
                <Camera className="h-4 w-4" aria-hidden="true" />
                {tr(locale, "Choose a photo", "اختيار صورة")}
              </Button>
            )}
          </div>
          <div className="flex flex-col items-stretch gap-2">
            <Button type="button" onClick={() => save("pdf")}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              {tr(locale, "Download PDF", "تنزيل PDF")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => save("image")}>
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              {tr(locale, "Save as Image", "حفظ كصورة")}
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-4 text-xs text-slate-500 dark:text-navy-400">
        {tr(
          locale,
          "The photo above is used for this ID card. Changing it here updates the same photo shown throughout the app.",
          "الصورة أعلاه تُستخدم لبطاقة الهوية هذه. تغييرها هنا يُحدّث نفس الصورة المعروضة في جميع أنحاء التطبيق.",
        )}
      </Card>
    </PracticeFrame>
  );
}
