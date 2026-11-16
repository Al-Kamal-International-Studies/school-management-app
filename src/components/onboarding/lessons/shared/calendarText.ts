import type { LessonTexts } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";

const AUD: Record<string, { seenByEn: string[]; seenByAr: string[]; notSeenByEn: string[]; notSeenByAr: string[]; noteEn: string; noteAr: string }> = {
  teacher: {
    seenByEn: ["You, for events marked Everyone or Teachers"],
    seenByAr: ["أنت، للأحداث المخصصة للجميع أو للمعلمين"],
    notSeenByEn: ["Events meant only for students or parents"],
    notSeenByAr: ["الأحداث المخصصة للطلاب أو لأولياء الأمور فقط"],
    noteEn: "Only admins add or delete events. The Calendar page has no filters, and nobody is notified when an event is added.",
    noteAr: "المدراء وحدهم يضيفون الأحداث أو يحذفونها. ليس في صفحة التقويم مرشحات، ولا يصل إشعار لأحد عند إضافة حدث.",
  },
  student: {
    seenByEn: ["You, for events marked Everyone or Students", "Your parents, for Student events"],
    seenByAr: ["أنت، للأحداث المخصصة للجميع أو للطلاب", "وأولياء أمورك، للأحداث المخصصة للطلاب"],
    notSeenByEn: ["Events meant only for teachers or parents"],
    notSeenByAr: ["الأحداث المخصصة للمعلمين أو لأولياء الأمور فقط"],
    noteEn: "Only admins add or delete events. The Calendar page has no filters, and nobody is notified when an event is added.",
    noteAr: "المدراء وحدهم يضيفون الأحداث أو يحذفونها. ليس في صفحة التقويم مرشحات، ولا يصل إشعار لأحد عند إضافة حدث.",
  },
  parent: {
    seenByEn: ["You, for events marked Everyone or Parents", "Events meant for students, too"],
    seenByAr: ["أنت، للأحداث المخصصة للجميع أو لأولياء الأمور", "والأحداث المخصصة للطلاب أيضًا"],
    notSeenByEn: ["Events meant only for teachers"],
    notSeenByAr: ["الأحداث المخصصة للمعلمين فقط"],
    noteEn: "Only admins add or delete events. The Calendar page has no filters, and nobody is notified when an event is added.",
    noteAr: "المدراء وحدهم يضيفون الأحداث أو يحذفونها. ليس في صفحة التقويم مرشحات، ولا يصل إشعار لأحد عند إضافة حدث.",
  },
};

export function calendarText(role: UserRole): LessonTexts {
  const a = AUD[role] ?? AUD.teacher!;
  const forEn = role === "teacher" ? "Everyone or Teachers" : role === "student" ? "Everyone or Students" : "Everyone, Students or Parents";
  const forAr = role === "teacher" ? "الجميع أو المعلمين" : role === "student" ? "الجميع أو الطلاب" : "الجميع أو الطلاب أو أولياء الأمور";
  return {
    en: {
      title: "Calendar",
      oneLiner: "See the school's upcoming events, holidays and deadlines.",
      what: [
        "The Calendar lists what is coming up at school, starting from today. Each card shows the date, a title, a badge for the type (event, holiday or deadline) and sometimes a short description.",
        `Admins add these items and choose who they are for. You see the ones addressed to ${forEn}. The page is read-only: you can look, but not change anything.`,
      ],
      useWhen: "you want to check the next holiday, a deadline, or a school event.",
      visibility: { seenBy: a.seenByEn, notSeenBy: a.notSeenByEn, note: a.noteEn },
      tasks: [
        { id: "holiday", label: "Find the next holiday", hint: "Press the card that has the Holiday badge." },
        { id: "deadline", label: "Find a deadline", hint: "Press the card that has the Deadline badge." },
        { id: "audience", label: "Find an event that is not for everyone", hint: "Read the practice note under each card, then press one that does not say Everyone." },
      ],
      whereToFind: "Calendar, in the sidebar.",
    },
    ar: {
      title: "التقويم",
      oneLiner: "اطّلع على فعاليات المدرسة القادمة وعطلاتها ومواعيدها النهائية.",
      what: [
        "يعرض التقويم ما هو قادم في المدرسة ابتداءً من اليوم. تُظهر كل بطاقة التاريخ والعنوان وشارة النوع (حدث أو عطلة أو موعد نهائي) وأحيانًا وصفًا قصيرًا.",
        `يضيف المدراء هذه العناصر ويختارون لمن تظهر. أنت ترى ما هو موجّه إلى ${forAr}. الصفحة للقراءة فقط: يمكنك الاطلاع ولا يمكنك تغيير شيء.`,
      ],
      useWhen: "تريد معرفة العطلة القادمة، أو موعدًا نهائيًا، أو فعالية مدرسية.",
      visibility: { seenBy: a.seenByAr, notSeenBy: a.notSeenByAr, note: a.noteAr },
      tasks: [
        { id: "holiday", label: "اعثر على العطلة القادمة", hint: "اضغط البطاقة التي عليها شارة «عطلة»." },
        { id: "deadline", label: "اعثر على موعد نهائي", hint: "اضغط البطاقة التي عليها شارة «موعد نهائي»." },
        { id: "audience", label: "اعثر على حدث ليس للجميع", hint: "اقرأ الملاحظة التدريبية تحت كل بطاقة، ثم اضغط بطاقة لا تقول «الجميع»." },
      ],
      whereToFind: "التقويم، في القائمة الجانبية.",
    },
  };
}
