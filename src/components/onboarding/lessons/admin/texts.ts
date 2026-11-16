import type { LessonText, LessonTexts } from "@/lib/onboarding/types";

type Task = [id: string, label: string, hint: string];

function lt(o: {
  title: string;
  oneLiner: string;
  what: string[];
  useWhen: string;
  seenBy: string[];
  notSeenBy: string[];
  note?: string;
  tasks: Task[];
  where: string;
}): LessonText {
  return {
    title: o.title,
    oneLiner: o.oneLiner,
    what: o.what,
    useWhen: o.useWhen,
    visibility: { seenBy: o.seenBy, notSeenBy: o.notSeenBy, note: o.note },
    tasks: o.tasks.map(([id, label, hint]) => ({ id, label, hint })),
    whereToFind: o.where,
  };
}

const ADMINS_EN = ["Admins"];
const ADMINS_AR = ["المسؤولون"];
const NOT_EN = ["Teachers", "Students", "Parents"];
const NOT_AR = ["المعلمون", "الطلاب", "أولياء الأمور"];

export const adminTexts: Record<string, LessonTexts> = {
  overview: {
    en: lt({
      title: "Overview",
      oneLiner: "A snapshot of your school and a launch pad for the most common jobs.",
      what: [
        "Overview is the first page you see. It shows the number of students, teachers and classes, and this week's attendance compared with last week.",
        "Under Needs attention you see pending leave requests, open feedback and pending password resets. Each row is a button that takes you to the right page. Quick actions jump straight to the forms you use most.",
      ],
      useWhen: "you start your day and want to know what needs you.",
      seenBy: ADMINS_EN,
      notSeenBy: NOT_EN,
      note: "Nothing is sent to you when a leave request or feedback arrives. The counts here are how you find out, so check this page often.",
      tasks: [
        ["open-attention", "Open a row under Needs attention", "Press any row under Needs attention, for example Pending leave requests."],
        ["use-quick-action", "Use a quick action", "Press any button under Quick actions, such as New admission."],
        ["read-attendance", "Find where the attendance rate comes from", "Press the link under the four number cards."],
      ],
      where: "Overview, the first item in the sidebar.",
    }),
    ar: lt({
      title: "نظرة عامة",
      oneLiner: "لمحة عن مدرستك ومنصة انطلاق لأكثر المهام تكرارًا.",
      what: [
        "النظرة العامة هي أول صفحة تراها. تعرض عدد الطلاب والمعلمين والفصول، ونسبة الحضور هذا الأسبوع مقارنة بالأسبوع الماضي.",
        "تحت «يحتاج إلى انتباه» ترى طلبات الإجازة المعلّقة والملاحظات المفتوحة وطلبات إعادة تعيين كلمة المرور. كل صف زر ينقلك إلى الصفحة المناسبة. وتنقلك الإجراءات السريعة مباشرة إلى النماذج الأكثر استخدامًا.",
      ],
      useWhen: "تبدأ يومك وتريد أن تعرف ما الذي يحتاج إليك.",
      seenBy: ADMINS_AR,
      notSeenBy: NOT_AR,
      note: "لا يصلك أي إشعار عند وصول طلب إجازة أو ملاحظة. هذه الأرقام هي طريقتك لمعرفة ذلك، فتفقّد هذه الصفحة باستمرار.",
      tasks: [
        ["open-attention", "افتح صفًّا تحت «يحتاج إلى انتباه»", "اضغط أي صف تحت «يحتاج إلى انتباه»، مثل «طلبات إجازة معلّقة»."],
        ["use-quick-action", "استخدم إجراءً سريعًا", "اضغط أي زر تحت «إجراءات سريعة»، مثل «قبول جديد»."],
        ["read-attendance", "اعرف من أين تأتي نسبة الحضور", "اضغط الرابط الموجود تحت بطاقات الأرقام الأربع."],
      ],
      where: "نظرة عامة، أول عنصر في الشريط الجانبي.",
    }),
  },

  users: {
    en: lt({
      title: "Users",
      oneLiner: "Create and manage teacher, student and parent accounts.",
      what: [
        "Add user creates a teacher, student or parent account with a temporary password that you share securely. Teachers need an Employee ID and students need an Enrollment number.",
        "From the list you can search, filter by role, and switch an account off or on. An account that was locked after three wrong passwords shows as Deactivated. Press Activate and the failed-attempt count is cleared so the person can sign in again.",
        "On a person's own page you can edit details, link parents to children, set a new password, or archive the account.",
      ],
      useWhen: "a new person joins, or someone is locked out.",
      seenBy: ADMINS_EN,
      notSeenBy: NOT_EN,
      note: "Locked admin accounts can't be reactivated here, and admin accounts aren't listed on this page. Archived accounts can never be reactivated.",
      tasks: [
        ["create-teacher", "Create a teacher account", "Press Add user, choose Teacher, fill in the name, email, a password of 12 or more characters and an Employee ID, then press Create account."],
        ["reactivate-locked", "Reactivate a locked student", "Back in the list, press Activate on Yusuf Example's row (status Deactivated)."],
      ],
      where: "Users, in the sidebar.",
    }),
    ar: lt({
      title: "المستخدمون",
      oneLiner: "إنشاء حسابات المعلمين والطلاب وأولياء الأمور وإدارتها.",
      what: [
        "«إضافة مستخدم» تنشئ حساب معلم أو طالب أو ولي أمر بكلمة مرور مؤقتة تشاركها بشكل آمن. يحتاج المعلم إلى رقم وظيفي، ويحتاج الطالب إلى رقم قيد.",
        "من القائمة يمكنك البحث والتصفية حسب الدور وإيقاف الحساب أو تفعيله. الحساب الذي قُفل بعد ثلاث كلمات مرور خاطئة يظهر بحالة «موقوف». اضغط «تفعيل» فيُصفَّر عدد المحاولات الفاشلة ويستطيع صاحبه تسجيل الدخول من جديد.",
        "في صفحة الشخص نفسه يمكنك تعديل بياناته وربط أولياء الأمور بالأبناء وتعيين كلمة مرور جديدة أو أرشفة الحساب.",
      ],
      useWhen: "ينضم شخص جديد، أو يُقفل حساب أحدهم.",
      seenBy: ADMINS_AR,
      notSeenBy: NOT_AR,
      note: "لا يمكن إعادة تفعيل حسابات المسؤولين المقفلة من هنا، وحسابات المسؤولين غير معروضة في هذه الصفحة. والحسابات المؤرشفة لا يمكن إعادة تفعيلها أبدًا.",
      tasks: [
        ["create-teacher", "أنشئ حساب معلم", "اضغط «إضافة مستخدم» واختر «معلم» واكتب الاسم والبريد الإلكتروني وكلمة مرور من 12 حرفًا أو أكثر والرقم الوظيفي، ثم اضغط «إنشاء الحساب»."],
        ["reactivate-locked", "أعد تفعيل حساب طالب مقفل", "في القائمة، اضغط «تفعيل» في صف يوسف مثال (حالته «موقوف»)."],
      ],
      where: "المستخدمون، في الشريط الجانبي.",
    }),
  },

  admissions: {
    en: lt({
      title: "Admissions",
      oneLiner: "One form that creates the student and parent accounts, a PDF and a welcome email.",
      what: [
        "Admissions turns a paper registration into a digital one. You fill in one long form: student, parents, address, medical history, three required acknowledgements and the enrolment grade.",
        "When you submit, everything happens at once: the official PDF is made, a student account and a parent account are created (or the family's existing parent account is reused), and a welcome email with both logins is queued. There is no review or accept step.",
        "At least one parent email is needed. Without it the record is saved but shows Failed, and you can add an email and press Retry processing.",
      ],
      useWhen: "a new family registers a child.",
      seenBy: ADMINS_EN,
      notSeenBy: NOT_EN,
      note: "If no email service is set up, the welcome email waits in Pending outbound emails with a Copy button, and it contains the family's temporary passwords. Only admins see it.",
      tasks: [
        ["submit-admission", "Fill the form and submit it", "Press Fill in example details (or type a name, choose a gender, add a parent email and tick all three acknowledgements), then press Submit admission."],
        ["copy-welcome-email", "Copy the queued welcome email", "On the result screen, press Copy under Pending outbound emails."],
      ],
      where: "Admissions, in the sidebar.",
    }),
    ar: lt({
      title: "القبول",
      oneLiner: "نموذج واحد ينشئ حسابَي الطالب وولي الأمر وملف PDF ورسالة ترحيب.",
      what: [
        "القبول يحوّل التسجيل الورقي إلى تسجيل رقمي. تملأ نموذجًا طويلًا واحدًا: الطالب والوالدين والعنوان والتاريخ الطبي وثلاثة إقرارات مطلوبة والصف الدراسي للتسجيل.",
        "عند الإرسال يتم كل شيء دفعة واحدة: يُنشأ ملف PDF الرسمي، ويُنشأ حساب للطالب وحساب لولي الأمر (أو يُعاد استخدام حساب ولي الأمر الحالي للعائلة)، وتوضع رسالة ترحيب ببيانات الدخول في قائمة الانتظار. لا توجد مرحلة مراجعة أو قبول.",
        "يلزم بريد إلكتروني واحد على الأقل لأحد الوالدين. بدونه يُحفظ السجل لكن بحالة «فشلت»، ويمكنك إضافة بريد ثم الضغط على «إعادة المحاولة».",
      ],
      useWhen: "تسجّل عائلة جديدة طفلها.",
      seenBy: ADMINS_AR,
      notSeenBy: NOT_AR,
      note: "إذا لم تكن خدمة البريد مُعدّة، تبقى رسالة الترحيب في «رسائل بريد إلكتروني صادرة معلّقة» مع زر «نسخ»، وهي تتضمن كلمات المرور المؤقتة للعائلة. لا يراها إلا المسؤولون.",
      tasks: [
        ["submit-admission", "املأ النموذج وأرسله", "اضغط «تعبئة بيانات تجريبية» (أو اكتب اسمًا واختر الجنس وأضف بريد ولي أمر وضع علامة على الإقرارات الثلاثة)، ثم اضغط «إرسال طلب القبول»."],
        ["copy-welcome-email", "انسخ رسالة الترحيب المعلّقة", "في شاشة النتيجة، اضغط «نسخ» تحت «رسائل بريد إلكتروني صادرة معلّقة»."],
      ],
      where: "القبول، في الشريط الجانبي.",
    }),
  },

  "id-cards": {
    en: lt({
      title: "ID cards",
      oneLiner: "Look up any student's ID card, download it, or change the photo.",
      what: [
        "This page lists students. Search for one and press View ID card to see the official card.",
        "From the card you can download a PDF or save it as an image, and change the student's photo. The photo is the student's profile picture, so changing it changes it everywhere in the app.",
      ],
      useWhen: "a family needs a card or a photo needs replacing.",
      seenBy: ["Admins", "The student (their own card)", "Their parents (their own child's card)", "Teachers (only students of classes they teach)"],
      notSeenBy: ["Other students", "Other parents"],
      note: "Teachers can view and download cards but can't change photos. Photos must be PNG and up to 4 MB.",
      tasks: [
        ["open-card", "Open a student's ID card", "Press View ID card next to any student."],
        ["download-card", "Download the card", "Press Download PDF or Save as Image under the card."],
      ],
      where: "ID cards, in the sidebar.",
    }),
    ar: lt({
      title: "بطاقات الهوية",
      oneLiner: "اعرض بطاقة هوية أي طالب ونزّلها أو غيّر الصورة.",
      what: [
        "تعرض هذه الصفحة قائمة الطلاب. ابحث عن طالب واضغط «عرض بطاقة الهوية» لترى البطاقة الرسمية.",
        "من البطاقة يمكنك تنزيل ملف PDF أو حفظها كصورة وتغيير صورة الطالب. هذه الصورة هي صورته الشخصية، لذلك تغييرها يغيّرها في كل أنحاء التطبيق.",
      ],
      useWhen: "تحتاج عائلة إلى بطاقة أو تحتاج صورة إلى استبدال.",
      seenBy: ["المسؤولون", "الطالب (بطاقته هو)", "أولياء أمره (بطاقة ابنهم)", "المعلمون (طلاب الفصول التي يدرّسونها فقط)"],
      notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون"],
      note: "يستطيع المعلمون عرض البطاقات وتنزيلها لكن لا يستطيعون تغيير الصور. يجب أن تكون الصورة بصيغة PNG وبحجم حتى 4 ميغابايت.",
      tasks: [
        ["open-card", "افتح بطاقة هوية طالب", "اضغط «عرض بطاقة الهوية» بجانب أي طالب."],
        ["download-card", "نزّل البطاقة", "اضغط «تنزيل PDF» أو «حفظ كصورة» أسفل البطاقة."],
      ],
      where: "بطاقات الهوية، في الشريط الجانبي.",
    }),
  },

  "password-resets": {
    en: lt({
      title: "Password reset requests",
      oneLiner: "People who tapped Forgot password? appear here, and you set them a new password.",
      what: [
        "When someone uses Forgot password? on the sign-in page, a request appears here and admins get a push alert. The person always sees the same confirmation, whether or not their email exists.",
        "There is no Approve button. Each row offers View account and Dismiss. To fix the problem, press View account, then Set a new password on the user page. That also completes the request. Then tell the person their new temporary password.",
        "A request with no matching account only offers Dismiss.",
      ],
      useWhen: "someone says they can't sign in and forgot their password.",
      seenBy: ADMINS_EN,
      notSeenBy: NOT_EN,
      tasks: [
        ["view-account", "Open the person's account", "Press View account on the first request."],
        ["set-password", "Set a new password", "Type a password of 12 or more characters (or press Generate), then press Set password."],
        ["dismiss", "Dismiss a request", "Back in the list, press Dismiss on the request for nobody@practice.example."],
      ],
      where: "Password resets, in the sidebar.",
    }),
    ar: lt({
      title: "طلبات إعادة تعيين كلمة المرور",
      oneLiner: "يظهر هنا من ضغط «هل نسيت كلمة المرور؟»، وتعيّن لهم كلمة مرور جديدة.",
      what: [
        "عندما يستخدم أحدهم «هل نسيت كلمة المرور؟» في صفحة تسجيل الدخول يظهر طلب هنا ويصل المسؤولين تنبيه. يرى الشخص التأكيد نفسه دائمًا، سواء كان بريده موجودًا أم لا.",
        "لا يوجد زر «موافقة». كل صف يعرض «عرض الحساب» و«تجاهل». لحل المشكلة اضغط «عرض الحساب» ثم «تعيين كلمة مرور جديدة» في صفحة المستخدم، وهذا يُكمل الطلب أيضًا. بعدها أخبر الشخص بكلمة مروره المؤقتة الجديدة.",
        "الطلب الذي لا يطابق أي حساب يعرض خيار «تجاهل» فقط.",
      ],
      useWhen: "يقول أحدهم إنه لا يستطيع الدخول لأنه نسي كلمة المرور.",
      seenBy: ADMINS_AR,
      notSeenBy: NOT_AR,
      tasks: [
        ["view-account", "افتح حساب الشخص", "اضغط «عرض الحساب» عند الطلب الأول."],
        ["set-password", "عيّن كلمة مرور جديدة", "اكتب كلمة مرور من 12 حرفًا أو أكثر (أو اضغط «توليد»)، ثم اضغط «تعيين كلمة المرور»."],
        ["dismiss", "تجاهل طلبًا", "في القائمة، اضغط «تجاهل» عند الطلب الخاص بـ nobody@practice.example."],
      ],
      where: "إعادة تعيين كلمات المرور، في الشريط الجانبي.",
    }),
  },

  classes: {
    en: lt({
      title: "Classes",
      oneLiner: "Create classes and decide which teacher teaches which subject in each.",
      what: [
        "Create a class with a name, section, academic year (like 2026 or 2026-2027) and an optional homeroom teacher.",
        "Open a class to set its Subject teachers. Assigning a teacher to a subject creates that subject's class chat and gives the teacher attendance, assignments, exams, grades, remarks and progress for the class. Assigning the same subject again swaps the teacher.",
        "Students are placed in a class from the Users page.",
      ],
      useWhen: "you set up a new year or change who teaches a subject.",
      seenBy: ADMINS_EN,
      notSeenBy: ["Teachers (they only see the result in their own pages)", "Students", "Parents"],
      note: "Removing a subject teacher also deletes that subject's class chat, and the timetable keeps listing the old teacher until you change it.",
      tasks: [
        ["create-class", "Create a class", 'Fill in a class name, a section and the year 2026-2027, then press Create class.'],
        ["assign-subject", "Assign a subject teacher", "In the class that opens, choose a subject and a teacher, then press Assign."],
      ],
      where: "Classes, in the sidebar.",
    }),
    ar: lt({
      title: "الفصول",
      oneLiner: "أنشئ الفصول وحدّد أي معلم يدرّس أي مادة في كل فصل.",
      what: [
        "أنشئ فصلًا باسم وشعبة وعام دراسي (مثل 2026 أو 2026-2027) ومعلم فصل اختياري.",
        "افتح الفصل لتحديد معلمي المواد. تعيين معلم لمادة ينشئ محادثة الفصل لتلك المادة ويمنح المعلم الحضور والواجبات والاختبارات والدرجات والملاحظات والتقدم لهذا الفصل. وتعيين المادة نفسها مرة أخرى يستبدل المعلم.",
        "يُوزَّع الطلاب على الفصول من صفحة المستخدمين.",
      ],
      useWhen: "تجهّز عامًا دراسيًا جديدًا أو تغيّر من يدرّس مادة.",
      seenBy: ADMINS_AR,
      notSeenBy: ["المعلمون (يرون النتيجة في صفحاتهم فقط)", "الطلاب", "أولياء الأمور"],
      note: "إزالة معلم مادة تحذف أيضًا محادثة الفصل لتلك المادة، ويبقى الجدول الزمني يعرض المعلم القديم حتى تغيّره.",
      tasks: [
        ["create-class", "أنشئ فصلًا", "اكتب اسم فصل وشعبة والعام 2026-2027، ثم اضغط «إنشاء فصل»."],
        ["assign-subject", "عيّن معلم مادة", "في الفصل الذي يُفتح، اختر مادة ومعلمًا ثم اضغط «تعيين»."],
      ],
      where: "الفصول، في الشريط الجانبي.",
    }),
  },

  subjects: {
    en: lt({
      title: "Subjects",
      oneLiner: "The school-wide list of subjects used by classes and timetables.",
      what: [
        "Add a subject with a name and a short code. Codes must be unique.",
        "A subject can be deleted only while nothing uses it. If classes or timetable periods still use it, the app refuses and tells you how many.",
      ],
      useWhen: "the school starts teaching something new.",
      seenBy: ADMINS_EN,
      notSeenBy: ["Students", "Parents"],
      note: "Teachers see subjects only through their classes and timetables.",
      tasks: [
        ["add-subject", "Add a subject", 'Type a name such as "Art" and a code such as "ART", then press Add.'],
        ["delete-refused", "See a delete refused", "Press Delete on Mathematics. It is in use, so the app explains why it can't be removed."],
      ],
      where: "Subjects, in the sidebar.",
    }),
    ar: lt({
      title: "المواد",
      oneLiner: "قائمة المواد على مستوى المدرسة التي تستخدمها الفصول والجداول.",
      what: [
        "أضف مادة باسم ورمز قصير. يجب أن يكون الرمز فريدًا.",
        "لا يمكن حذف المادة إلا إذا لم يستخدمها شيء. فإن كانت الفصول أو حصص الجدول ما زالت تستخدمها، يرفض التطبيق ويخبرك بالأعداد.",
      ],
      useWhen: "تبدأ المدرسة بتدريس مادة جديدة.",
      seenBy: ADMINS_AR,
      notSeenBy: ["الطلاب", "أولياء الأمور"],
      note: "يرى المعلمون المواد من خلال فصولهم وجداولهم فقط.",
      tasks: [
        ["add-subject", "أضف مادة", 'اكتب اسمًا مثل «Art» ورمزًا مثل «ART»، ثم اضغط «إضافة».'],
        ["delete-refused", "شاهد رفض الحذف", "اضغط «حذف» عند الرياضيات. هي مستخدمة، فيشرح التطبيق سبب عدم إمكانية حذفها."],
      ],
      where: "المواد، في الشريط الجانبي.",
    }),
  },

  timetable: {
    en: lt({
      title: "Timetable",
      oneLiner: "Build each class's weekly schedule. The app refuses double-bookings.",
      what: [
        "Pick a class, then add a period: subject, day, start time, end time and an optional room. The teacher is filled in automatically from the class's subject assignments.",
        "The app checks two things: the class can't have two periods at the same time, and a teacher can't teach two classes at the same time. When there is a clash, it says which time is taken.",
        "Teachers can also build and edit periods for classes in the school, so changes may come from them too.",
      ],
      useWhen: "you build a new term's schedule or move a lesson.",
      seenBy: ["Admins", "Teachers (their own timetable page, and they can edit)", "Students (their class)"],
      notSeenBy: ["Other classes' students"],
      note: "A class needs at least one subject-teacher assignment before periods can be added. Do that on the Classes page first.",
      tasks: [
        ["place-period", "Place a period", "For the first class choose Mathematics, Monday, 09:00 to 09:45, then press Add period."],
        ["class-clash", "See a class clash refused", "Choose English, Monday, 09:30 to 10:15 for the same class and press Add period."],
        ["teacher-clash", "See a teacher clash refused", "Switch Class to the second class, choose Mathematics, Monday, 09:00 to 09:45 and press Add period."],
      ],
      where: "Timetable, in the sidebar.",
    }),
    ar: lt({
      title: "الجدول الدراسي",
      oneLiner: "أنشئ الجدول الأسبوعي لكل فصل. يرفض التطبيق الحجز المزدوج.",
      what: [
        "اختر فصلًا ثم أضف حصة: المادة واليوم ووقت البدء ووقت الانتهاء وقاعة اختيارية. يُملأ المعلم تلقائيًا من تعيينات مواد الفصل.",
        "يتحقق التطبيق من أمرين: لا يمكن أن يكون للفصل حصتان في الوقت نفسه، ولا يمكن لمعلم أن يدرّس فصلين في الوقت نفسه. وعند وجود تعارض يخبرك بالوقت المحجوز.",
        "يستطيع المعلمون أيضًا إنشاء حصص فصول المدرسة وتعديلها، لذلك قد تأتي بعض التغييرات منهم.",
      ],
      useWhen: "تُنشئ جدول فصل دراسي جديد أو تنقل حصة.",
      seenBy: ["المسؤولون", "المعلمون (صفحة جدولهم، ويستطيعون التعديل)", "الطلاب (جدول فصلهم)"],
      notSeenBy: ["طلاب الفصول الأخرى"],
      note: "يحتاج الفصل إلى تعيين معلم مادة واحد على الأقل قبل إضافة الحصص. افعل ذلك أولًا من صفحة الفصول.",
      tasks: [
        ["place-period", "ضع حصة", "للفصل الأول اختر الرياضيات، الاثنين، من 09:00 إلى 09:45، ثم اضغط «إضافة الحصة»."],
        ["class-clash", "شاهد رفض تعارض في الفصل", "اختر اللغة الإنجليزية، الاثنين، من 09:30 إلى 10:15 للفصل نفسه ثم اضغط «إضافة الحصة»."],
        ["teacher-clash", "شاهد رفض تعارض في المعلم", "بدّل الفصل إلى الفصل الثاني، واختر الرياضيات، الاثنين، من 09:00 إلى 09:45 ثم اضغط «إضافة الحصة»."],
      ],
      where: "الجدول الدراسي، في الشريط الجانبي.",
    }),
  },

  progress: {
    en: lt({
      title: "Progress",
      oneLiner: "Read every monthly progress entry teachers filed, school-wide.",
      what: [
        "Teachers file a monthly progress entry for each student. This page lists them all so you can see how students are doing.",
        "Filter by student, class and month, then press Submit. Press Export to get a CSV file. The overall score is the average of six factors the teacher rated.",
      ],
      useWhen: "you want a school-wide picture of how students are doing.",
      seenBy: ["Admins", "The teacher who wrote the entry", "The student", "Their parents"],
      notSeenBy: ["Other students", "Other parents"],
      note: "This page is read-only. Progress comments are visible to the student and their parents.",
      tasks: [
        ["apply-filter", "Filter by class", "Choose a class in the Class menu, then press Submit."],
        ["export-csv", "Export the rows", "Press Export."],
      ],
      where: "Progress, in the sidebar.",
    }),
    ar: lt({
      title: "التقدم",
      oneLiner: "اطّلع على كل إدخالات التقدم الشهرية التي رفعها المعلمون في المدرسة.",
      what: [
        "يرفع المعلمون إدخال تقدم شهريًا لكل طالب. تعرضها هذه الصفحة كلها لتعرف كيف يسير الطلاب.",
        "صفِّ حسب الطالب والفصل والشهر ثم اضغط «إرسال». واضغط «تصدير» للحصول على ملف CSV. الدرجة الإجمالية هي متوسط ستة عوامل قيّمها المعلم.",
      ],
      useWhen: "تريد صورة شاملة عن أداء الطلاب في المدرسة.",
      seenBy: ["المسؤولون", "المعلم الذي كتب الإدخال", "الطالب", "أولياء أمره"],
      notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون"],
      note: "هذه الصفحة للقراءة فقط. تعليقات التقدم يراها الطالب وأولياء أمره.",
      tasks: [
        ["apply-filter", "صفِّ حسب الفصل", "اختر فصلًا من قائمة «الفصل» ثم اضغط «إرسال»."],
        ["export-csv", "صدّر الصفوف", "اضغط «تصدير»."],
      ],
      where: "التقدم، في الشريط الجانبي.",
    }),
  },

  "leave-requests": {
    en: lt({
      title: "Leave requests",
      oneLiner: "Approve or reject time-off requests from students and parents.",
      what: [
        "Students and parents send leave requests. Each pending row has Approve and Reject buttons, and each asks you to confirm.",
        "After you decide, the badge changes and the student and every linked parent get a notification with the result.",
      ],
      useWhen: "a family asks for time off.",
      seenBy: ["Admins", "The student", "Their parents"],
      notSeenBy: ["Other students", "Other parents"],
      note: "You are not alerted when a request arrives. The count on Overview is how you notice it.",
      tasks: [
        ["approve", "Approve a request", "Press Approve on any pending row, then press Yes."],
        ["reject", "Reject a request", "Press Reject on a different pending row, then press Yes."],
      ],
      where: "Leave requests, in the sidebar.",
    }),
    ar: lt({
      title: "طلبات الإجازة",
      oneLiner: "وافق على طلبات الإجازة من الطلاب وأولياء الأمور أو ارفضها.",
      what: [
        "يرسل الطلاب وأولياء الأمور طلبات الإجازة. لكل صف معلّق زرا «موافقة» و«رفض»، وكل منهما يطلب منك التأكيد.",
        "بعد قرارك تتغير الشارة ويصل الطالب وكل ولي أمر مرتبط به إشعار بالنتيجة.",
      ],
      useWhen: "تطلب عائلة إجازة.",
      seenBy: ["المسؤولون", "الطالب", "أولياء أمره"],
      notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون"],
      note: "لا يصلك تنبيه عند وصول طلب. العدد في النظرة العامة هو طريقتك لملاحظته.",
      tasks: [
        ["approve", "وافق على طلب", "اضغط «موافقة» عند أي صف معلّق ثم اضغط «نعم»."],
        ["reject", "ارفض طلبًا", "اضغط «رفض» عند صف معلّق آخر ثم اضغط «نعم»."],
      ],
      where: "طلبات الإجازة، في الشريط الجانبي.",
    }),
  },

  events: {
    en: lt({
      title: "Calendar",
      oneLiner: "Add school events, holidays and deadlines, and choose who sees them.",
      what: [
        "Add an event with a title, optional message, date, type (Event, Holiday or Deadline) and audience.",
        "The audience decides who can see it. Everyone shows it to all roles. Teachers shows it to teachers. Parents shows it to parents. Students shows it to students and to their parents.",
      ],
      useWhen: "you plan a holiday, a parents' evening or a deadline.",
      seenBy: ["Admins", "People in the chosen audience"],
      notSeenBy: ["People outside the audience"],
      note: "No notification is sent when you add an event. People find it in their Calendar.",
      tasks: [
        ["add-event", "Add an event", "Type a title, pick a date, then press Submit."],
        ["student-audience", "Add an event for Students", "Choose Students as the Audience and press Submit. Read who sees it."],
      ],
      where: "Calendar, in the sidebar.",
    }),
    ar: lt({
      title: "التقويم",
      oneLiner: "أضف فعاليات المدرسة وعطلها ومواعيدها النهائية، وحدّد من يراها.",
      what: [
        "أضف حدثًا بعنوان ورسالة اختيارية وتاريخ ونوع (حدث أو عطلة أو موعد نهائي) وفئة مستهدفة.",
        "الفئة المستهدفة تحدد من يراه. «الجميع» يعرضه لكل الأدوار. «المعلمون» للمعلمين. «أولياء الأمور» لأولياء الأمور. «الطلاب» للطلاب ولأولياء أمورهم.",
      ],
      useWhen: "تخطط لعطلة أو لاجتماع أولياء الأمور أو لموعد نهائي.",
      seenBy: ["المسؤولون", "أفراد الفئة المستهدفة"],
      notSeenBy: ["من هم خارج الفئة المستهدفة"],
      note: "لا يُرسل أي إشعار عند إضافة حدث. يجده الناس في تقويمهم.",
      tasks: [
        ["add-event", "أضف حدثًا", "اكتب عنوانًا واختر تاريخًا ثم اضغط «إرسال»."],
        ["student-audience", "أضف حدثًا للطلاب", "اختر «الطلاب» كفئة مستهدفة واضغط «إرسال». ثم اقرأ من يراه."],
      ],
      where: "التقويم، في الشريط الجانبي.",
    }),
  },

  documents: {
    en: lt({
      title: "Documents",
      oneLiner: "Upload reports, certificates and policies for a group or for one student.",
      what: [
        "Upload a PDF, Word file, JPG or PNG up to 4 MB. Give it a title, a category and an audience.",
        "You can also attach it to one student. A student-specific document is visible only to that student, their parents and admins, whatever the audience says.",
      ],
      useWhen: "you share a report card, a certificate or a school policy.",
      seenBy: ["Admins", "The student and their parents (student-specific documents)", "People in the audience (general documents)"],
      notSeenBy: ["Everyone else"],
      note: "No notification is sent when you upload a document.",
      tasks: [
        ["upload-document", "Upload a document", "Type a title, choose Parents as the audience, pick term-1-report.pdf as the file and press Upload."],
        ["upload-student-document", "Upload one for a single student", "Do the same, but also choose a student under For Student, and press Upload."],
        ["refuse-bad-file", "See a wrong file type refused", "Pick setup.exe as the file and press Upload."],
      ],
      where: "Documents, in the sidebar.",
    }),
    ar: lt({
      title: "المستندات",
      oneLiner: "ارفع التقارير والشهادات والسياسات لمجموعة أو لطالب واحد.",
      what: [
        "ارفع ملف PDF أو وورد أو JPG أو PNG بحجم حتى 4 ميغابايت. أعطه عنوانًا وفئة وفئة مستهدفة.",
        "ويمكنك ربطه بطالب واحد. المستند المخصص لطالب يراه ذلك الطالب وأولياء أمره والمسؤولون فقط، مهما كانت الفئة المستهدفة.",
      ],
      useWhen: "تشارك بطاقة تقرير أو شهادة أو سياسة مدرسية.",
      seenBy: ["المسؤولون", "الطالب وأولياء أمره (المستندات المخصصة لطالب)", "أفراد الفئة المستهدفة (المستندات العامة)"],
      notSeenBy: ["بقية الناس"],
      note: "لا يُرسل أي إشعار عند رفع مستند.",
      tasks: [
        ["upload-document", "ارفع مستندًا", "اكتب عنوانًا، واختر «أولياء الأمور» كفئة، واختر الملف term-1-report.pdf ثم اضغط «رفع»."],
        ["upload-student-document", "ارفع مستندًا لطالب واحد", "افعل الشيء نفسه، لكن اختر أيضًا طالبًا في «لطالب محدد» ثم اضغط «رفع»."],
        ["refuse-bad-file", "شاهد رفض نوع ملف خاطئ", "اختر الملف setup.exe ثم اضغط «رفع»."],
      ],
      where: "المستندات، في الشريط الجانبي.",
    }),
  },

  announcements: {
    en: lt({
      title: "Announcements",
      oneLiner: "Post a message to everyone or to one group, and it rings their bell.",
      what: [
        "Write a title and a message and choose the audience: Everyone, Teachers, Students or Parents. The announcement shows on the matching dashboards.",
        "Everyone with an account in that audience gets an in-app notification and a push alert. Everyone means every account in the school, including inactive accounts and the admins themselves.",
        "A Students announcement notifies students only. Parents can read it on their dashboard, but they are not notified.",
      ],
      useWhen: "you need to tell a group something, like a closure or a reminder.",
      seenBy: ["Admins", "People in the audience"],
      notSeenBy: ["People outside the audience"],
      note: "To reach parents with a notification, choose Parents or Everyone.",
      tasks: [
        ["post-announcement", "Post an announcement", "Type a title and a message, then press Submit."],
        ["student-audience", "Post one for Students", "Choose Students as the Audience and press Submit. Read who is notified."],
        ["delete-announcement", "Delete one", "Press Delete on a posted announcement and confirm with Yes."],
      ],
      where: "Announcements, in the sidebar.",
    }),
    ar: lt({
      title: "الإعلانات",
      oneLiner: "انشر رسالة للجميع أو لمجموعة واحدة، وسيصلهم إشعار.",
      what: [
        "اكتب عنوانًا ورسالة واختر الفئة المستهدفة: الجميع أو المعلمون أو الطلاب أو أولياء الأمور. يظهر الإعلان في لوحات التحكم المطابقة.",
        "كل صاحب حساب في تلك الفئة يصله إشعار داخل التطبيق وتنبيه. «الجميع» تعني كل حساب في المدرسة، بما فيها الحسابات غير النشطة والمسؤولون أنفسهم.",
        "الإعلان الموجّه للطلاب ينبّه الطلاب فقط. يستطيع أولياء الأمور قراءته في لوحتهم، لكن لا يصلهم إشعار.",
      ],
      useWhen: "تريد إبلاغ مجموعة بأمر، مثل إغلاق أو تذكير.",
      seenBy: ["المسؤولون", "أفراد الفئة المستهدفة"],
      notSeenBy: ["من هم خارج الفئة المستهدفة"],
      note: "لإيصال إشعار إلى أولياء الأمور اختر «أولياء الأمور» أو «الجميع».",
      tasks: [
        ["post-announcement", "انشر إعلانًا", "اكتب عنوانًا ورسالة ثم اضغط «إرسال»."],
        ["student-audience", "انشر إعلانًا للطلاب", "اختر «الطلاب» كفئة مستهدفة واضغط «إرسال». ثم اقرأ من يصله الإشعار."],
        ["delete-announcement", "احذف إعلانًا", "اضغط «حذف» عند إعلان منشور وأكّد بالضغط على «نعم»."],
      ],
      where: "الإعلانات، في الشريط الجانبي.",
    }),
  },

  "message-safety": {
    en: lt({
      title: "Message safety",
      oneLiner: "Review messages the safety filter blocked or found borderline.",
      what: [
        "Every message passes a safety filter. A blocked message never reaches anyone. A flagged message is delivered but listed here for you to look at, for example a borderline model score or wellbeing wording.",
        "Each item shows the sender, the full message, why it was caught, and two buttons: Mark harmful or Mark fine. Your marks help retrain the filter. When something is flagged, every admin gets an alert that names the sender but never shows the text.",
        "Every admin can read the full text of blocked and flagged messages on this page. This is the one window other admins have into chats.",
      ],
      useWhen: "an alert says a message was blocked or needs review.",
      seenBy: ADMINS_EN,
      notSeenBy: NOT_EN,
      note: "Only the oversight account can read whole chats. Other admins see only the blocked or flagged messages shown here.",
      tasks: [
        ["mark-harmful", "Mark a message harmful", "On the blocked message, press Mark harmful."],
        ["mark-fine", "Mark a message fine", "On the flagged message about the exam, press Mark fine."],
      ],
      where: "Message safety, in the sidebar.",
    }),
    ar: lt({
      title: "أمان الرسائل",
      oneLiner: "راجع الرسائل التي حظرها فلتر الأمان أو اعتبرها مشبوهة.",
      what: [
        "تمر كل رسالة عبر فلتر أمان. الرسالة المحظورة لا تصل لأحد. أما المعلَّمة فتصل لكنها تظهر هنا لتنظر فيها، مثل رسالة بدرجة نموذج حدّية أو صياغة تدل على قلق على السلامة النفسية.",
        "يعرض كل عنصر المرسل والرسالة كاملة وسبب اصطيادها وزرّين: «تحديد كضارة» أو «تحديد كسليمة». تحديداتك تساعد في إعادة تدريب الفلتر. وعند تعليم رسالة يصل كل مسؤول تنبيه يذكر المرسل دون عرض النص.",
        "يستطيع كل مسؤول قراءة النص الكامل للرسائل المحظورة والمعلَّمة في هذه الصفحة. هذه هي النافذة الوحيدة المتاحة لبقية المسؤولين على المحادثات.",
      ],
      useWhen: "ينبّهك إشعار إلى رسالة محظورة أو تحتاج إلى مراجعة.",
      seenBy: ADMINS_AR,
      notSeenBy: NOT_AR,
      note: "حساب الإشراف وحده يقرأ المحادثات الكاملة. بقية المسؤولين لا يرون إلا الرسائل المحظورة أو المعلَّمة المعروضة هنا.",
      tasks: [
        ["mark-harmful", "حدّد رسالة كضارة", "عند الرسالة المحظورة، اضغط «تحديد كضارة»."],
        ["mark-fine", "حدّد رسالة كسليمة", "عند الرسالة المعلَّمة المتعلقة بالاختبار، اضغط «تحديد كسليمة»."],
      ],
      where: "أمان الرسائل، في الشريط الجانبي.",
    }),
  },

  "chat-oversight": {
    en: lt({
      title: "Chat oversight",
      oneLiner: "The school's oversight account can read every chat, read-only.",
      what: [
        "This page exists for one account only: the school's oversight account. It lists every private chat and subject group and lets that account open any of them.",
        "It is a safety measure, so that the school can look into a serious concern. Opening a chat here is read-only and leaves no read receipt. In a private chat between other people it can't post, though it can post in subject groups it belongs to.",
        "Other admins can't read whole chats. They only see blocked or flagged messages in Message safety.",
      ],
      useWhen: "a serious safety concern needs a look at the full conversation.",
      seenBy: ["The oversight account only"],
      notSeenBy: ["Other admins", "Teachers", "Students", "Parents"],
      note: "The chats in this practice are made-up and harmless. Chat participants can see each other's messages, and the school is open about the oversight account.",
      tasks: [
        ["open-chat", "Open a private chat", "Press Open on the chat between Ms. Teacher One and Mrs. Sample."],
        ["open-group", "Open a subject group", "Go back, then press Open on the Mathematics subject group."],
      ],
      where: "Chat oversight, in the sidebar (only for the oversight account).",
    }),
    ar: lt({
      title: "الإشراف على المحادثات",
      oneLiner: "حساب الإشراف في المدرسة يستطيع قراءة كل محادثة، للقراءة فقط.",
      what: [
        "هذه الصفحة موجودة لحساب واحد فقط: حساب الإشراف في المدرسة. تعرض كل محادثة خاصة وكل مجموعة مادة، وتتيح لذلك الحساب فتح أي منها.",
        "هي إجراء أمان ليتمكن المدرسة من النظر في قلق جدي. فتح محادثة من هنا للقراءة فقط ولا يترك أثر قراءة. لا يمكنه الكتابة في محادثة خاصة بين آخرين، لكنه يستطيع الكتابة في مجموعات المواد التي ينتمي إليها.",
        "لا يستطيع بقية المسؤولين قراءة المحادثات الكاملة. يرون فقط الرسائل المحظورة أو المعلَّمة في «أمان الرسائل».",
      ],
      useWhen: "يحتاج قلق أمني جدي إلى الاطلاع على المحادثة كاملة.",
      seenBy: ["حساب الإشراف فقط"],
      notSeenBy: ["بقية المسؤولين", "المعلمون", "الطلاب", "أولياء الأمور"],
      note: "المحادثات في هذا التدريب مختلقة وغير ضارة. يرى أطراف المحادثة رسائل بعضهم، والمدرسة صريحة بشأن حساب الإشراف.",
      tasks: [
        ["open-chat", "افتح محادثة خاصة", "اضغط «فتح» عند المحادثة بين الأستاذة معلمة أولى والسيدة نموذج."],
        ["open-group", "افتح مجموعة مادة", "ارجع، ثم اضغط «فتح» عند مجموعة مادة الرياضيات."],
      ],
      where: "الإشراف على المحادثات، في الشريط الجانبي (لحساب الإشراف فقط).",
    }),
  },

  feedback: {
    en: lt({
      title: "Feedback",
      oneLiner: "The inbox of what teachers, students and parents sent through Feedback.",
      what: [
        "People send feedback from their own Feedback page. It lands here with the sender, a category (Technical, Academic, Suggestion or General), the subject and message, and a status.",
        "Set each item to New, Reviewed or Resolved with the Status menu so you can see what is still open. The count of open items shows on Overview.",
      ],
      useWhen: "you go through what the school community has told you.",
      seenBy: ["Admins", "The person who sent it (their own feedback)"],
      notSeenBy: ["Other teachers, students and parents"],
      note: "You are not notified when feedback arrives, and changing the status does not message the sender.",
      tasks: [
        ["mark-reviewed", "Mark an item Reviewed", "Open the Status menu on a row and choose Reviewed."],
        ["mark-resolved", "Mark an item Resolved", "Choose Resolved on a row."],
      ],
      where: "Feedback, in the sidebar.",
    }),
    ar: lt({
      title: "الملاحظات",
      oneLiner: "صندوق ما أرسله المعلمون والطلاب وأولياء الأمور عبر صفحة الملاحظات.",
      what: [
        "يرسل الناس ملاحظاتهم من صفحة الملاحظات الخاصة بهم. تصل إلى هنا مع المرسل والفئة (تقنية أو أكاديمية أو اقتراح أو عامة) والموضوع والرسالة والحالة.",
        "اضبط كل عنصر على «جديد» أو «تمت المراجعة» أو «تم الحل» من قائمة الحالة لتعرف ما بقي مفتوحًا. ويظهر عدد العناصر المفتوحة في النظرة العامة.",
      ],
      useWhen: "تراجع ما أخبرك به مجتمع المدرسة.",
      seenBy: ["المسؤولون", "من أرسلها (ملاحظاته هو)"],
      notSeenBy: ["بقية المعلمين والطلاب وأولياء الأمور"],
      note: "لا يصلك إشعار عند وصول ملاحظة، وتغيير الحالة لا يرسل رسالة إلى المرسل.",
      tasks: [
        ["mark-reviewed", "اجعل عنصرًا «تمت المراجعة»", "افتح قائمة الحالة في صف واختر «تمت المراجعة»."],
        ["mark-resolved", "اجعل عنصرًا «تم الحل»", "اختر «تم الحل» في صف."],
      ],
      where: "الملاحظات، في الشريط الجانبي.",
    }),
  },

  "audit-log": {
    en: lt({
      title: "Audit log",
      oneLiner: "A list of the latest recorded actions: who did what, to which record, and when.",
      what: [
        "The audit log shows the latest 200 recorded actions. There is no filter, search or export, so you scan the list.",
        "It records admin actions such as creating or locking accounts, setting passwords and approving leave. It also records teacher actions such as marking attendance and recording grades. Entries made by the system, like the automatic lock after three wrong passwords, show System as the actor.",
        "Nobody can edit or delete entries from the app.",
      ],
      useWhen: "you need to know who changed something, and when.",
      seenBy: ADMINS_EN,
      notSeenBy: NOT_EN,
      note: "Not everything is logged. Sign-ins, messages, document downloads and student actions are not recorded here.",
      tasks: [
        ["find-teacher-action", "Find who marked attendance", "Press the row whose action is mark_attendance."],
        ["find-lock", "Find an automatic lock", "Press the row whose action is auto_deactivate_failed_logins."],
      ],
      where: "Audit log, in the sidebar.",
    }),
    ar: lt({
      title: "سجل التدقيق",
      oneLiner: "قائمة بآخر الإجراءات المسجَّلة: من فعل ماذا، وعلى أي سجل، ومتى.",
      what: [
        "يعرض سجل التدقيق آخر 200 إجراء مسجَّل. لا يوجد فلتر ولا بحث ولا تصدير، لذلك تتصفح القائمة.",
        "يسجّل إجراءات المسؤولين مثل إنشاء الحسابات أو قفلها وتعيين كلمات المرور والموافقة على الإجازات. ويسجّل أيضًا إجراءات المعلمين مثل تسجيل الحضور والدرجات. والإجراءات التي ينفذها النظام، كالقفل التلقائي بعد ثلاث كلمات مرور خاطئة، يظهر فيها «النظام» كفاعل.",
        "لا يستطيع أحد تعديل السجلات أو حذفها من التطبيق.",
      ],
      useWhen: "تريد أن تعرف من غيّر شيئًا ومتى.",
      seenBy: ADMINS_AR,
      notSeenBy: NOT_AR,
      note: "ليس كل شيء مسجَّلًا. عمليات تسجيل الدخول والرسائل وتنزيل المستندات وإجراءات الطلاب لا تُسجَّل هنا.",
      tasks: [
        ["find-teacher-action", "اعثر على من سجّل الحضور", "اضغط الصف الذي إجراؤه mark_attendance."],
        ["find-lock", "اعثر على قفل تلقائي", "اضغط الصف الذي إجراؤه auto_deactivate_failed_logins."],
      ],
      where: "سجل التدقيق، في الشريط الجانبي.",
    }),
  },
};
