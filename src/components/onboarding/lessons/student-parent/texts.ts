import type { LessonTexts } from "@/lib/onboarding/types";

/**
 * The words of every student and parent lesson, English and Arabic.
 * Task ids are identical in both languages, in the same order.
 * Facts come from docs/onboarding/FEATURE_MAP.md only.
 */

/* ------------------------------- Student ------------------------------- */

export const studentDashboardText: LessonTexts = {
  en: {
    title: "Dashboard",
    oneLiner: "Your day at a glance: lessons, work that is due, marks and notes from your teachers.",
    what: [
      "The Dashboard is the first page you see. It shows your class, your attendance, your overall progress and today's lessons.",
      "Under that you find work that is due soon, school announcements, your latest marks and comments from your teachers. Tap a row to open the full page for it.",
    ],
    useWhen: "you want to know what is happening today and what is due next.",
    visibility: {
      seenBy: ["You", "Your parents", "Admins"],
      notSeenBy: ["Other students", "Other parents"],
      note: "Teacher remarks and behaviour notes, including negative ones, also show here. Your parents can see them too.",
    },
    tasks: [
      { id: "lesson", label: "Find your first lesson today", hint: "In Today's schedule, press the lesson with the earliest time." },
      { id: "due", label: "Find the work that is due first", hint: "In Upcoming tasks & exams, press the item with the earliest date." },
      { id: "grade", label: "Open your Mathematics mark", hint: "In Recent grades, press the Mathematics row." },
    ],
    whereToFind: "Dashboard, the first item in the sidebar.",
  },
  ar: {
    title: "لوحة التحكم",
    oneLiner: "يومك في نظرة واحدة: الحصص، والمهام المستحقة، والدرجات، وملاحظات معلميك.",
    what: [
      "لوحة التحكم هي أول صفحة تراها. تعرض فصلك وحضورك وتقدمك الدراسي العام وحصص اليوم.",
      "وتحتها تجد المهام المستحقة قريبًا، وإعلانات المدرسة، وأحدث درجاتك، وتعليقات معلميك. اضغط على أي صف لفتح صفحته الكاملة.",
    ],
    useWhen: "تريد أن تعرف ما سيحدث اليوم وما المطلوب منك بعد ذلك.",
    visibility: {
      seenBy: ["أنت", "ولي أمرك", "الإدارة"],
      notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون"],
      note: "ملاحظات المعلمين وسجل السلوك، بما فيها الملاحظات السلبية، تظهر هنا أيضًا. ويستطيع ولي أمرك رؤيتها كذلك.",
    },
    tasks: [
      { id: "lesson", label: "اعثر على أول حصة لك اليوم", hint: "في «جدول اليوم»، اضغط على الحصة ذات أبكر وقت." },
      { id: "due", label: "اعثر على المهمة الأقرب موعدًا", hint: "في «المهام والاختبارات القادمة»، اضغط على العنصر ذي أبكر تاريخ." },
      { id: "grade", label: "افتح درجتك في الرياضيات", hint: "في «أحدث الدرجات»، اضغط على صف الرياضيات." },
    ],
    whereToFind: "لوحة التحكم، أول عنصر في الشريط الجانبي.",
  },
};

export const studentIdCardText: LessonTexts = {
  en: {
    title: "ID card",
    oneLiner: "Your official school ID, ready to view or save on your device.",
    what: [
      "This page shows your school ID card with your photo, name, class and student number.",
      "You can save a copy as a PDF or as a picture. To print it, save the PDF first and print that file.",
      "You can also change your photo here. The same photo is then used as your picture everywhere in the app.",
    ],
    useWhen: "you need to show your ID or want a copy on your phone.",
    visibility: {
      seenBy: ["You", "Your parents", "Your teachers", "Admins"],
      notSeenBy: ["Other students", "Other parents"],
      note: "Your parents and admins can change your photo too. A photo can be JPG, PNG or WebP, up to 4 MB.",
    },
    tasks: [
      { id: "photo", label: "Change your photo", hint: "Press Choose a photo, then pick the sample photo." },
      { id: "pdf", label: "Download your card as a PDF", hint: "Press Download PDF." },
      { id: "image", label: "Save your card as an image", hint: "Press Save as Image." },
    ],
    whereToFind: "ID card, in the sidebar.",
  },
  ar: {
    title: "بطاقة الهوية",
    oneLiner: "بطاقة هويتك المدرسية الرسمية، جاهزة للعرض أو الحفظ على جهازك.",
    what: [
      "تعرض هذه الصفحة بطاقة هويتك المدرسية بصورتك واسمك وفصلك ورقم الطالب.",
      "يمكنك حفظ نسخة بصيغة PDF أو كصورة. وللطباعة، احفظ ملف PDF أولًا ثم اطبعه.",
      "ويمكنك أيضًا تغيير صورتك من هنا. وتُستخدم الصورة نفسها كصورتك الشخصية في كل أنحاء التطبيق.",
    ],
    useWhen: "تحتاج إلى إبراز هويتك أو إلى نسخة منها على هاتفك.",
    visibility: {
      seenBy: ["أنت", "ولي أمرك", "معلموك", "الإدارة"],
      notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون"],
      note: "يستطيع ولي أمرك والإدارة تغيير صورتك أيضًا. ويمكن أن تكون الصورة بصيغة JPG أو PNG أو WebP وبحجم حتى 4 ميغابايت.",
    },
    tasks: [
      { id: "photo", label: "غيّر صورتك", hint: "اضغط «اختيار صورة»، ثم اختر الصورة التجريبية." },
      { id: "pdf", label: "نزّل بطاقتك بصيغة PDF", hint: "اضغط «تنزيل PDF»." },
      { id: "image", label: "احفظ بطاقتك كصورة", hint: "اضغط «حفظ كصورة»." },
    ],
    whereToFind: "بطاقة الهوية، في الشريط الجانبي.",
  },
};

export const studentTimetableText: LessonTexts = {
  en: {
    title: "My timetable",
    oneLiner: "Your lessons for the whole week: subject, teacher and room.",
    what: [
      "My timetable shows the weekly lessons of your class. Each lesson has a time, a subject, the teacher and the room.",
      "You cannot change it. If a lesson looks wrong, tell your teacher.",
      "If you see \"Nothing scheduled yet\", the school has not published a timetable. If it says you have no class, contact your school administrator.",
    ],
    useWhen: "you want to know tomorrow's lessons or where a lesson is.",
    visibility: {
      seenBy: ["You", "Your classmates", "Your teachers", "Admins"],
      notSeenBy: ["Students in other classes"],
      note: "Everyone in your class sees the same timetable.",
    },
    tasks: [
      { id: "wednesday", label: "Find Wednesday's second lesson", hint: "Look at the Wednesday card and press the lesson that starts at 09:00." },
      { id: "thursday-maths", label: "Find your Mathematics lesson on Thursday", hint: "Look at the Thursday card and press Mathematics to see its room." },
    ],
    whereToFind: "My timetable, in the sidebar.",
  },
  ar: {
    title: "جدولي الزمني",
    oneLiner: "حصصك لأسبوع كامل: المادة والمعلم والقاعة.",
    what: [
      "يعرض جدولي الزمني حصص فصلك الأسبوعية. لكل حصة وقت ومادة ومعلم وقاعة.",
      "لا يمكنك تغييره. وإذا بدت لك حصة خاطئة، أخبر معلمك.",
      "إذا ظهرت عبارة «لا يوجد شيء مجدول بعد»، فهذا يعني أن المدرسة لم تنشر الجدول بعد. وإذا ذُكر أنك بلا فصل، تواصل مع إدارة المدرسة.",
    ],
    useWhen: "تريد معرفة حصص الغد أو مكان حصة معينة.",
    visibility: {
      seenBy: ["أنت", "زملاؤك في الفصل", "معلموك", "الإدارة"],
      notSeenBy: ["طلاب الفصول الأخرى"],
      note: "كل من في فصلك يرى الجدول نفسه.",
    },
    tasks: [
      { id: "wednesday", label: "اعثر على الحصة الثانية يوم الأربعاء", hint: "انظر إلى بطاقة الأربعاء واضغط على الحصة التي تبدأ الساعة 09:00." },
      { id: "thursday-maths", label: "اعثر على حصة الرياضيات يوم الخميس", hint: "انظر إلى بطاقة الخميس واضغط على الرياضيات لترى قاعتها." },
    ],
    whereToFind: "جدولي الزمني، في الشريط الجانبي.",
  },
};

export const studentAttendanceText: LessonTexts = {
  en: {
    title: "Attendance",
    oneLiner: "How often you were in school, day by day.",
    what: [
      "Attendance shows your attendance rate and how many days you were Present, Late, Absent or Excused. Under that is a list of your days with a status for each.",
      "Only your teachers and the school can mark attendance. You cannot change it. If you will miss school, send a leave request. You do not get an alert when attendance is marked, so look here when you want to check.",
      "A late day still counts as attended. Excused days are left out when the rate is worked out.",
    ],
    useWhen: "you want to check your days at school or you wonder why your rate changed.",
    visibility: {
      seenBy: ["You", "Your parents", "Teachers of your class", "Admins"],
      notSeenBy: ["Other students", "Other parents"],
      note: "Other students can never see your attendance.",
    },
    tasks: [
      { id: "late", label: "Find the day you were late", hint: "Press the Late tile to show only late days, then press that day's row." },
      { id: "absent", label: "Find the day you were absent", hint: "Press the Absent tile, then press that day's row." },
      { id: "rate", label: "See how your rate is worked out", hint: "Press the Attendance tile at the start of the row of tiles." },
    ],
    whereToFind: "Attendance, in the sidebar.",
  },
  ar: {
    title: "الحضور",
    oneLiner: "عدد المرات التي حضرت فيها إلى المدرسة، يومًا بيوم.",
    what: [
      "يعرض الحضور نسبة حضورك وعدد الأيام التي كنت فيها حاضرًا أو متأخرًا أو غائبًا أو معذورًا. وتحتها قائمة بأيامك مع حالة كل يوم.",
      "المعلمون والمدرسة فقط يسجلون الحضور، ولا يمكنك تغييره. وإذا كنت ستغيب عن المدرسة فأرسل طلب إجازة. ولا يصلك تنبيه عند تسجيل الحضور، فتفقّد هذه الصفحة متى أردت.",
      "اليوم الذي تأخرت فيه يُحسب حضورًا. أما الأيام المعذورة فلا تدخل في حساب النسبة.",
    ],
    useWhen: "تريد مراجعة أيامك في المدرسة أو تتساءل لماذا تغيرت نسبتك.",
    visibility: {
      seenBy: ["أنت", "ولي أمرك", "معلمو فصلك", "الإدارة"],
      notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون"],
      note: "لا يستطيع الطلاب الآخرون رؤية حضورك أبدًا.",
    },
    tasks: [
      { id: "late", label: "اعثر على اليوم الذي تأخرت فيه", hint: "اضغط على بطاقة «متأخر» لعرض أيام التأخر فقط، ثم اضغط على صف ذلك اليوم." },
      { id: "absent", label: "اعثر على اليوم الذي غبت فيه", hint: "اضغط على بطاقة «غائب»، ثم اضغط على صف ذلك اليوم." },
      { id: "rate", label: "اعرف كيف تُحسب نسبة حضورك", hint: "اضغط على بطاقة «الحضور» في بداية صف البطاقات." },
    ],
    whereToFind: "الحضور، في الشريط الجانبي.",
  },
};

export const studentAssignmentsText: LessonTexts = {
  en: {
    title: "Assignments",
    oneLiner: "Your homework, and the button that says you have handed it in.",
    what: [
      "My Assignments shows the homework your teachers set for your class. Each card has the subject, the due date and a status: Pending, Submitted or Graded. You are told when a new assignment is set.",
      "When you have finished a piece of work, open it and press Mark as Submitted. There is nothing to upload, so hand in the real work the way your teacher asks. Your teacher does not get an alert when you press the button. They see the status when they open the assignment.",
      "Once a teacher has graded it, you see your grade and their feedback on the card.",
    ],
    useWhen: "you have finished your homework or want to see what is due and what feedback you got.",
    visibility: {
      seenBy: ["You", "Your teacher", "Admins", "Your parents (upcoming assignments only)"],
      notSeenBy: ["Other students", "Other parents"],
      note: "Other students cannot see your submissions or your grades.",
    },
    tasks: [
      { id: "open", label: "Open the Mathematics homework", hint: "Press the title Fractions worksheet to open its details." },
      { id: "submit", label: "Mark it as submitted", hint: "Press Mark as Submitted. The status changes from Pending to Submitted." },
      { id: "graded", label: "Read the grade on your graded work", hint: "Open the English essay. It shows the grade and your teacher's feedback." },
    ],
    whereToFind: "Assignments, in the sidebar.",
  },
  ar: {
    title: "الواجبات",
    oneLiner: "واجباتك المدرسية، والزر الذي يخبر بأنك سلّمتها.",
    what: [
      "تعرض «واجباتي» الواجبات التي وضعها معلموك لفصلك. على كل بطاقة المادة وتاريخ التسليم والحالة: معلّق أو تم التسليم أو تم التقييم. ويصلك تنبيه عند إضافة واجب جديد.",
      "عندما تنهي عملًا، افتحه واضغط «تحديد كمُسلَّم». لا يوجد رفع للملفات، لذا سلّم عملك الفعلي بالطريقة التي يطلبها معلمك. ولا يصل المعلم تنبيه عند ضغطك الزر، بل يرى الحالة حين يفتح الواجب.",
      "وبعد أن يقيّم المعلم عملك، ترى درجتك وملاحظاته على البطاقة.",
    ],
    useWhen: "أنهيت واجبك أو تريد أن ترى المطلوب منك والملاحظات التي حصلت عليها.",
    visibility: {
      seenBy: ["أنت", "معلمك", "الإدارة", "ولي أمرك (الواجبات القادمة فقط)"],
      notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون"],
      note: "لا يستطيع الطلاب الآخرون رؤية تسليماتك أو درجاتك.",
    },
    tasks: [
      { id: "open", label: "افتح واجب الرياضيات", hint: "اضغط على العنوان «ورقة عمل الكسور» لفتح تفاصيله." },
      { id: "submit", label: "حدّده كمُسلَّم", hint: "اضغط «تحديد كمُسلَّم». ستتغير الحالة من «معلّق» إلى «تم التسليم»." },
      { id: "graded", label: "اقرأ الدرجة على العمل المُقيَّم", hint: "افتح مقال اللغة الإنجليزية. ستجد الدرجة وملاحظات معلمك." },
    ],
    whereToFind: "الواجبات، في الشريط الجانبي.",
  },
};

export const studentExamsText: LessonTexts = {
  en: {
    title: "Exams",
    oneLiner: "The exams and quizzes coming up for your class.",
    what: [
      "Exams lists every exam and quiz set for your class. Each one has a title, the subject, the type (Exam or Quiz), the date and the room.",
      "It is read-only. You are told when a new exam or quiz is added. Your marks come later and appear under Grades.",
    ],
    useWhen: "you plan your revision or need the date and room of a test.",
    visibility: {
      seenBy: ["You and your classmates", "Your parents", "The teacher who set it", "Admins"],
      notSeenBy: ["Students in other classes"],
    },
    tasks: [
      { id: "quiz", label: "Find your next quiz", hint: "Look for the Quiz badge in the Type column and press the first quiz in the list." },
      { id: "maths-room", label: "Find the room of the Mathematics exam", hint: "Press the Mathematics exam to see its room." },
    ],
    whereToFind: "Exams, in the sidebar.",
  },
  ar: {
    title: "الاختبارات",
    oneLiner: "الاختبارات والمذاكرات القادمة لفصلك.",
    what: [
      "تعرض صفحة الاختبارات كل اختبار ومذاكرة وُضعت لفصلك. ولكل منها عنوان ومادة ونوع (اختبار أو مذاكرة) وتاريخ وقاعة.",
      "الصفحة للقراءة فقط. ويصلك تنبيه عند إضافة اختبار أو مذاكرة جديدة. أما درجاتك فتأتي لاحقًا وتظهر في «الدرجات».",
    ],
    useWhen: "تخطط لمراجعتك أو تحتاج إلى موعد اختبار وقاعته.",
    visibility: {
      seenBy: ["أنت وزملاؤك في الفصل", "ولي أمرك", "المعلم الذي وضعه", "الإدارة"],
      notSeenBy: ["طلاب الفصول الأخرى"],
    },
    tasks: [
      { id: "quiz", label: "اعثر على مذاكرتك القادمة", hint: "ابحث عن علامة «مذاكرة» في عمود النوع، واضغط على أول مذاكرة في القائمة." },
      { id: "maths-room", label: "اعثر على قاعة اختبار الرياضيات", hint: "اضغط على اختبار الرياضيات لترى قاعته." },
    ],
    whereToFind: "الاختبارات، في الشريط الجانبي.",
  },
};

export const studentGradesText: LessonTexts = {
  en: {
    title: "Grades",
    oneLiner: "Your marks for every test and assessment.",
    what: [
      "Grades lists your marks. For each one you see the subject, the assessment, your marks out of the total and the term.",
      "You cannot change them. If a mark looks wrong, ask your teacher. You are not sent an alert when a mark is added, so check this page from time to time.",
    ],
    useWhen: "you want to see how you did in a test or compare your subjects.",
    visibility: {
      seenBy: ["You", "Your parents", "The teacher who recorded it", "Admins"],
      notSeenBy: ["Other students", "Other parents", "Other teachers"],
      note: "Other students can never see your grades.",
    },
    tasks: [
      { id: "maths", label: "Find your Mathematics midterm mark", hint: "Press the row that says Mathematics and Midterm." },
      { id: "lowest", label: "Find your lowest mark", hint: "Compare each mark with its total. Press a row to see its percentage, then press the lowest one." },
    ],
    whereToFind: "Grades, in the sidebar.",
  },
  ar: {
    title: "الدرجات",
    oneLiner: "درجاتك في كل اختبار وتقييم.",
    what: [
      "تعرض صفحة الدرجات علاماتك. ترى لكل درجة المادة والتقييم ودرجتك من المجموع والفصل الدراسي.",
      "لا يمكنك تغييرها. وإذا بدت لك درجة خاطئة فاسأل معلمك. ولا يصلك تنبيه عند إضافة درجة، فتفقّد هذه الصفحة من وقت إلى آخر.",
    ],
    useWhen: "تريد أن ترى أداءك في اختبار أو أن تقارن بين موادك.",
    visibility: {
      seenBy: ["أنت", "ولي أمرك", "المعلم الذي سجّلها", "الإدارة"],
      notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون", "المعلمون الآخرون"],
      note: "لا يستطيع الطلاب الآخرون رؤية درجاتك أبدًا.",
    },
    tasks: [
      { id: "maths", label: "اعثر على درجتك في اختبار منتصف الفصل بالرياضيات", hint: "اضغط على الصف المكتوب فيه «الرياضيات» و«اختبار منتصف الفصل»." },
      { id: "lowest", label: "اعثر على أدنى درجة لك", hint: "قارن كل درجة بمجموعها. اضغط على صف لترى نسبته المئوية، ثم اضغط على الأدنى." },
    ],
    whereToFind: "الدرجات، في الشريط الجانبي.",
  },
};

export const studentLeaveText: LessonTexts = {
  en: {
    title: "Leave requests",
    oneLiner: "Ask the school for a day or more off.",
    what: [
      "Leave requests lets you ask for time off. Fill in the start date, the end date and a short reason, then press Submit.",
      "Your request starts as Pending. An admin approves or rejects it, and you and your parents are told the decision. Nothing is sent when you submit, so nobody is alerted at that moment. If it is urgent, also tell a teacher or an adult at home.",
      "Your parents can see your requests. They can also send one for you from their own page.",
    ],
    useWhen: "you will miss school and want it recorded properly.",
    visibility: {
      seenBy: ["You", "Your parents", "Admins"],
      notSeenBy: ["Other students", "Other parents", "Your teachers (not in the app)"],
      note: "Only an admin decides. The start date can be up to two weeks in the past, but not earlier.",
    },
    tasks: [
      { id: "submit", label: "Send a leave request", hint: "Pick tomorrow as the start, a day a few days later as the end, write a short reason such as Doctor's appointment, then press Submit." },
      { id: "date-error", label: "See what a date that is too old does", hint: "Pick a start date three weeks ago, write any reason, press Submit and read the message." },
    ],
    whereToFind: "Leave requests, in the sidebar.",
  },
  ar: {
    title: "طلبات الإجازة",
    oneLiner: "اطلب من المدرسة يومًا أو أكثر من الإجازة.",
    what: [
      "تتيح لك صفحة طلبات الإجازة أن تطلب وقتًا بعيدًا عن المدرسة. اكتب تاريخ البدء وتاريخ الانتهاء وسببًا قصيرًا، ثم اضغط «إرسال».",
      "يبدأ طلبك بحالة «قيد الانتظار». ثم توافق الإدارة عليه أو ترفضه، ويصلك أنت وولي أمرك القرار. ولا يُرسَل شيء عند إرسال الطلب، فلا يتلقى أحد تنبيهًا في تلك اللحظة. وإذا كان الأمر عاجلًا، فأخبر أيضًا معلمًا أو أحد الكبار في البيت.",
      "يستطيع ولي أمرك رؤية طلباتك. ويمكنه أيضًا إرسال طلب عنك من صفحته.",
    ],
    useWhen: "ستغيب عن المدرسة وتريد تسجيل ذلك بالطريقة الصحيحة.",
    visibility: {
      seenBy: ["أنت", "ولي أمرك", "الإدارة"],
      notSeenBy: ["الطلاب الآخرون", "أولياء الأمور الآخرون", "معلموك (ليس في التطبيق)"],
      note: "الإدارة وحدها تقرر. ويمكن أن يسبق تاريخ البدء اليوم بأسبوعين على الأكثر.",
    },
    tasks: [
      { id: "submit", label: "أرسل طلب إجازة", hint: "اختر الغد تاريخًا للبدء، ويومًا بعده بعدة أيام للانتهاء، واكتب سببًا قصيرًا مثل «موعد عند الطبيب»، ثم اضغط «إرسال»." },
      { id: "date-error", label: "شاهد ما يحدث عند اختيار تاريخ قديم جدًا", hint: "اختر تاريخ بدء قبل ثلاثة أسابيع، واكتب أي سبب، واضغط «إرسال» ثم اقرأ الرسالة." },
    ],
    whereToFind: "طلبات الإجازة، في الشريط الجانبي.",
  },
};

/* -------------------------------- Parent -------------------------------- */

export const parentDashboardText: LessonTexts = {
  en: {
    title: "Dashboard",
    oneLiner: "Your child's school life in one place: attendance, marks, work and notes from teachers.",
    what: [
      "The Dashboard shows one child at a time: progress, attendance, upcoming assignments and exams, recent grades, school announcements, teacher remarks and the behaviour log. If you have more than one child at the school, a switcher with each child's name sits at the top. Choose a name and the whole page changes to that child.",
      "You can only look, with one exception. At the bottom you can send a leave request for the child you are viewing. An admin decides it and you are told the result.",
      "Remarks and behaviour entries, including negative ones, and progress comments are visible to you and your child. You are not alerted when an assignment, exam, grade, remark or attendance mark is added, so open the Dashboard from time to time. You are alerted about announcements for parents or everyone, leave decisions and chat messages.",
    ],
    useWhen: "you want to see how your child is doing or look for a teacher's note.",
    visibility: {
      seenBy: ["You (your own children only)", "Your child", "Admins"],
      notSeenBy: ["Other parents", "Other students"],
      note: "Remarks and behaviour entries, including negative ones, are visible to you and your child.",
    },
    tasks: [
      { id: "switch", label: "Switch to your second child, Lina", hint: "Press Lina Sample in the switcher at the top of the page." },
      { id: "attendance", label: "Find Lina's attendance", hint: "With Lina selected, press the Attendance card to read her rate." },
      { id: "grade", label: "Find Lina's Science mark", hint: "In Recent grades, press the Science row." },
      { id: "remark", label: "Find the negative entry in Lina's Behaviour log", hint: "Scroll to Behaviour log and press the entry marked Negative." },
    ],
    whereToFind: "Dashboard, the first item in the sidebar.",
  },
  ar: {
    title: "لوحة التحكم",
    oneLiner: "حياة طفلك المدرسية في مكان واحد: الحضور والدرجات والمهام وملاحظات المعلمين.",
    what: [
      "تعرض لوحة التحكم طفلًا واحدًا في كل مرة: التقدم والحضور والواجبات والاختبارات القادمة وأحدث الدرجات وإعلانات المدرسة وملاحظات المعلمين وسجل السلوك. وإذا كان لديك أكثر من طفل في المدرسة، يظهر في أعلى الصفحة مبدّل بأسماء أبنائك. اختر اسمًا فتتغير الصفحة كلها إلى ذلك الطفل.",
      "يمكنك المشاهدة فقط، إلا في أمر واحد. ففي أسفل الصفحة يمكنك إرسال طلب إجازة للطفل المعروض. وتقرر الإدارة في الطلب ويصلك الجواب.",
      "ملاحظات المعلمين وسجل السلوك، بما فيها الملاحظات السلبية، وتعليقات التقدم، كلها مرئية لك ولطفلك. ولا يصلك تنبيه عند إضافة واجب أو اختبار أو درجة أو ملاحظة أو تسجيل حضور، لذا افتح لوحة التحكم من وقت إلى آخر. أما تنبيهاتك فتصل عند إعلانات أولياء الأمور أو الإعلانات العامة، وقرارات الإجازات، ورسائل المحادثة.",
    ],
    useWhen: "تريد أن ترى مستوى طفلك أو تبحث عن ملاحظة من معلم.",
    visibility: {
      seenBy: ["أنت (أبناؤك فقط)", "طفلك", "الإدارة"],
      notSeenBy: ["أولياء الأمور الآخرون", "الطلاب الآخرون"],
      note: "ملاحظات المعلمين وسجل السلوك، بما فيها السلبية، مرئية لك ولطفلك.",
    },
    tasks: [
      { id: "switch", label: "انتقل إلى طفلتك الثانية لينا", hint: "اضغط على «لينا نموذج» في المبدّل أعلى الصفحة." },
      { id: "attendance", label: "اعثر على حضور لينا", hint: "بعد اختيار لينا، اضغط على بطاقة «الحضور» لتقرأ نسبتها." },
      { id: "grade", label: "اعثر على درجة لينا في العلوم", hint: "في «أحدث الدرجات»، اضغط على صف العلوم." },
      { id: "remark", label: "اعثر على الملاحظة السلبية في سجل سلوك لينا", hint: "انزل إلى «سجل السلوك» واضغط على السجل المكتوب عليه «سلبي»." },
    ],
    whereToFind: "لوحة التحكم، أول عنصر في الشريط الجانبي.",
  },
};

export const parentIdCardText: LessonTexts = {
  en: {
    title: "ID card",
    oneLiner: "Your child's official school ID, to view or save.",
    what: [
      "This page shows your child's school ID card. You can save it as a PDF or as a picture. There is no print button, so to print it, save the PDF and print that file.",
      "If you have more than one child, choose the child at the top first. The card changes to match.",
      "You can also change your child's photo here. The same photo is then used for your child everywhere in the app.",
    ],
    useWhen: "your child needs a copy of the ID or you want to update the photo.",
    visibility: {
      seenBy: ["You (your own children only)", "Your child", "Teachers of your child's classes", "Admins"],
      notSeenBy: ["Other parents", "Other students"],
      note: "Changing the photo here changes it for your child everywhere in the app. A photo can be JPG, PNG or WebP, up to 4 MB.",
    },
    tasks: [
      { id: "switch", label: "Show Lina's card", hint: "Press Lina Sample at the top of the page." },
      { id: "pdf", label: "Download the card as a PDF", hint: "Press Download PDF." },
      { id: "image", label: "Save the card as an image", hint: "Press Save as Image." },
    ],
    whereToFind: "ID card, in the sidebar.",
  },
  ar: {
    title: "بطاقة الهوية",
    oneLiner: "بطاقة هوية طفلك المدرسية الرسمية، للعرض أو الحفظ.",
    what: [
      "تعرض هذه الصفحة بطاقة هوية طفلك المدرسية. يمكنك حفظها بصيغة PDF أو كصورة. ولا يوجد زر للطباعة، لذا احفظ ملف PDF ثم اطبعه.",
      "إذا كان لديك أكثر من طفل، فاختر الطفل أولًا من أعلى الصفحة. فتتغير البطاقة لتناسبه.",
      "ويمكنك أيضًا تغيير صورة طفلك من هنا. وتُستخدم الصورة نفسها لطفلك في كل أنحاء التطبيق.",
    ],
    useWhen: "يحتاج طفلك إلى نسخة من الهوية أو تريد تحديث صورته.",
    visibility: {
      seenBy: ["أنت (أبناؤك فقط)", "طفلك", "معلمو فصول طفلك", "الإدارة"],
      notSeenBy: ["أولياء الأمور الآخرون", "الطلاب الآخرون"],
      note: "تغيير الصورة هنا يغيّرها لطفلك في كل أنحاء التطبيق. ويمكن أن تكون الصورة بصيغة JPG أو PNG أو WebP وبحجم حتى 4 ميغابايت.",
    },
    tasks: [
      { id: "switch", label: "اعرض بطاقة لينا", hint: "اضغط على «لينا نموذج» في أعلى الصفحة." },
      { id: "pdf", label: "نزّل البطاقة بصيغة PDF", hint: "اضغط «تنزيل PDF»." },
      { id: "image", label: "احفظ البطاقة كصورة", hint: "اضغط «حفظ كصورة»." },
    ],
    whereToFind: "بطاقة الهوية، في الشريط الجانبي.",
  },
};
