import type { LessonTexts } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";

export function documentsText(role: UserRole): LessonTexts {
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  const whatEn2 = isTeacher
    ? "You see general documents addressed to Everyone or Teachers. Documents attached to a single student are never shown to teachers."
    : isStudent
      ? "You see general documents addressed to Everyone or Students, plus any document attached to you, such as your report card."
      : "You see general documents addressed to Everyone or Parents, plus every document attached to one of your children, such as a report card. A document addressed to Students that isn't attached to your child won't appear.";
  const whatAr2 = isTeacher
    ? "ترى المستندات العامة الموجّهة إلى الجميع أو إلى المعلمين. أما المستندات المرتبطة بطالب واحد فلا تظهر للمعلمين أبدًا."
    : isStudent
      ? "ترى المستندات العامة الموجّهة إلى الجميع أو إلى الطلاب، إضافةً إلى أي مستند مرتبط بك مثل بطاقة تقريرك."
      : "ترى المستندات العامة الموجّهة إلى الجميع أو إلى أولياء الأمور، إضافةً إلى كل مستند مرتبط بأحد أبنائك مثل بطاقة التقرير. أما مستند موجّه إلى الطلاب وغير مرتبط بابنك فلا يظهر لك.";

  const seenByEn = isTeacher ? ["You, for documents marked Everyone or Teachers"] : isStudent ? ["You, for general documents and your own", "Your parents, for documents attached to you"] : ["You, for general documents and your children's own", "Your child, for documents attached to them"];
  const seenByAr = isTeacher ? ["أنت، للمستندات الموجّهة إلى الجميع أو المعلمين"] : isStudent ? ["أنت، للمستندات العامة ومستنداتك الخاصة", "وأولياء أمورك، للمستندات المرتبطة بك"] : ["أنت، للمستندات العامة ومستندات أبنائك الخاصة", "وابنك، للمستندات المرتبطة به"];
  const notSeenByEn = isTeacher ? ["Documents attached to a single student"] : isStudent ? ["Other students, for documents attached to you", "Documents meant only for teachers or parents"] : ["Other parents, for documents attached to your child", "Documents meant only for teachers"];
  const notSeenByAr = isTeacher ? ["المستندات المرتبطة بطالب واحد"] : isStudent ? ["الطلاب الآخرون، للمستندات المرتبطة بك", "المستندات الموجّهة إلى المعلمين أو أولياء الأمور فقط"] : ["أولياء الأمور الآخرون، للمستندات المرتبطة بابنك", "المستندات الموجّهة إلى المعلمين فقط"];

  const yoursEn = isTeacher
    ? { label: "Download a document meant for teachers", hint: "Press Download next to the Staff handbook." }
    : isStudent
      ? { label: "Download your report card", hint: "Press Download next to Term 1 report card." }
      : { label: "Download your child's report card", hint: "Press Download next to Term 1 report card: Omar Sample." };
  const yoursAr = isTeacher
    ? { label: "نزّل مستندًا موجّهًا للمعلمين", hint: "اضغط «تنزيل» بجانب دليل الموظفين." }
    : isStudent
      ? { label: "نزّل بطاقة تقريرك", hint: "اضغط «تنزيل» بجانب بطاقة تقرير الفصل الأول." }
      : { label: "نزّل بطاقة تقرير ابنك", hint: "اضغط «تنزيل» بجانب بطاقة تقرير الفصل الأول: عمر نموذج." };

  return {
    en: {
      title: "Documents",
      oneLiner: "Download the school's policies, certificates and reports that were shared with you.",
      what: [
        "Documents is a list of files the school has shared: policies, certificates, report cards and more. Each one shows its title, a category badge and the date it was added. Press Download to open the file.",
        whatEn2,
        "Only admins upload documents. They choose who each one is for, and nobody is notified when one is added, so check this page now and then.",
      ],
      useWhen: "you need a school policy, a report card or a certificate.",
      visibility: { seenBy: seenByEn, notSeenBy: notSeenByEn, note: "Download links work for about a minute and open in a new tab. Files can be PDF, Word, JPG or PNG." },
      tasks: [
        { id: "everyone", label: "Download a general document", hint: isTeacher || isStudent ? "Press Download next to Uniform policy." : "Press Download next to Uniform policy or Parents' handbook." },
        { id: "yours", ...yoursEn },
      ],
      whereToFind: "Documents, in the sidebar.",
    },
    ar: {
      title: "المستندات",
      oneLiner: "نزّل سياسات المدرسة وشهاداتها وتقاريرها التي شاركتها معك.",
      what: [
        "المستندات قائمة بالملفات التي شاركتها المدرسة: سياسات وشهادات وبطاقات تقارير وغيرها. يعرض كل مستند عنوانه وشارة فئته وتاريخ إضافته. اضغط «تنزيل» لفتح الملف.",
        whatAr2,
        "المدراء وحدهم يرفعون المستندات ويختارون لمن يظهر كل مستند، ولا يصل إشعار لأحد عند إضافة مستند جديد، لذلك تفقّد هذه الصفحة من حين لآخر.",
      ],
      useWhen: "تحتاج إلى سياسة مدرسية أو بطاقة تقرير أو شهادة.",
      visibility: { seenBy: seenByAr, notSeenBy: notSeenByAr, note: "تعمل روابط التنزيل لمدة دقيقة تقريبًا وتفتح في تبويبة جديدة. يمكن أن تكون الملفات PDF أو Word أو JPG أو PNG." },
      tasks: [
        { id: "everyone", label: "نزّل مستندًا عامًا", hint: isTeacher || isStudent ? "اضغط «تنزيل» بجانب سياسة الزي المدرسي." : "اضغط «تنزيل» بجانب سياسة الزي المدرسي أو دليل أولياء الأمور." },
        { id: "yours", ...yoursAr },
      ],
      whereToFind: "المستندات، في القائمة الجانبية.",
    },
  };
}
