/**
 * UI strings of the onboarding framework itself (the flow shell, questions,
 * glance, privacy, finish). Deliberately NOT in the global dictionaries
 * (src/lib/i18n/dictionaries); the only global key is nav.gettingStarted.
 *
 * `ar` is typed as the shape of `en`, so a missing or extra key is a compile
 * error; scripts/onboarding.test.ts also compares the key sets at runtime.
 * Placeholders are {n}, {total}, {done}, {name}, replaced with fill().
 */

const en = {
  common: {
    continueLater: "Continue later",
    back: "Back",
    next: "Next",
    finish: "Finish",
    close: "Close",
    hint: "Hint",
    hideHint: "Hide hint",
    lessonList: "All lessons",
    loading: "Loading…",
    previewNotice: "Preview only: nothing here is saved.",
    stepOf: "Step {n} of {total}",
    skipToContent: "Skip to content",
  },
  header: {
    title: "Getting started",
    chapters: ["Welcome", "Your app", "Lessons", "Privacy", "Finish"],
    whatsNew: "What's new",
    chapterLabel: "Chapter {n} of {total}: {name}",
  },
  welcome: {
    title: "Welcome to Al Kamal",
    intro:
      "Answer a few quick questions, take a short look around your app, then try each part with practice data. Nothing you do here is real or saved, and you can stop and continue later.",
    roleLine: {
      admin: "You're signed in as an administrator.",
      teacher: "You're signed in as a teacher.",
      student: "You're signed in as a student.",
      parent: "You're signed in as a parent.",
    },
  },
  questions: {
    progress: "Question {n} of {total}",
    language: {
      title: "Which language do you prefer?",
      hint: "The whole app switches straight away. You can change it later in Settings.",
      en: "English",
      ar: "العربية",
    },
    look: {
      title: "How should the app look?",
      hint: "Light or dark. You can change it later in Settings.",
      light: "Light",
      dark: "Dark",
    },
    device: {
      title: "What do you mostly use?",
      hint: "We'll match the examples and tips to your device.",
      phone: "Phone",
      computer: "Computer",
      both: "Both",
    },
    level: {
      title: "How used to school apps are you?",
      hint: "This changes how much help you get. The practice screens are the same.",
      new: { label: "New to this", desc: "Show me hints as I go." },
      some: { label: "Used some", desc: "Hints when I ask for them." },
      expert: { label: "Very comfortable", desc: "Keep it short." },
    },
    focus: {
      title: {
        admin: "What are you here to do?",
        teacher: "What will you do most?",
        student: "What do you want to check first?",
        parent: "What matters most to you?",
      },
      hint: "Pick up to {max}. Those lessons come first and are marked as your focus.",
      limit: "You can pick up to {max}.",
      options: {
        attendance: { label: "Attendance", desc: "Marking or checking who is present." },
        homework: { label: "Homework", desc: "Assignments, due dates and submissions." },
        examsGrades: { label: "Exams and grades", desc: "Setting exams and recording marks." },
        messagingParents: { label: "Messaging parents", desc: "Talking to parents and classes." },
        timetable: { label: "Timetable", desc: "Who teaches what, and when." },
        remarksProgress: { label: "Remarks and progress", desc: "Behaviour notes and monthly progress." },
        grades: { label: "Grades", desc: "Marks and how your child is doing." },
        messages: { label: "Messages", desc: "Talking to teachers and the school." },
        eventsDocuments: { label: "Events and documents", desc: "The school calendar and files." },
        setup: { label: "Set up classes and people", desc: "Users, classes, subjects and timetables." },
        admissions: { label: "Admissions", desc: "Enrolling new students and parents." },
        approvals: { label: "Day-to-day approvals", desc: "Leave requests and password resets." },
        communication: { label: "Communication", desc: "Announcements, events and messages." },
        oversight: { label: "Oversight and safety", desc: "Message safety, progress and the audit log." },
      },
    },
  },
  glance: {
    title: "Your app at a glance",
    intro: "This is your own sidebar. Each lesson takes a minute or two. Pick any item to jump straight to it.",
    groups: {
      teaching: "Teaching",
      classLife: "Class life",
      talking: "Talking to people",
      help: "Help and you",
      people: "People and accounts",
      setup: "School setup",
      comms: "Communication",
      records: "Records and you",
      today: "Your school day",
      school: "School life",
      child: "Your child",
      more: "More",
    },
  },
  lesson: {
    lessonOf: "Lesson {n} of {total}",
    yourFocus: "Your focus",
    done: "Done",
    whatItsFor: "What it's for",
    useWhen: "You'll use this when",
    whoCanSee: "Who can see this",
    seenBy: "Seen by",
    notSeenBy: "Not seen by",
    tryIt: "Try it",
    tasks: "Tasks",
    tasksDone: "{done} of {total} tasks done",
    taskDoneLabel: "done",
    showHint: "Show hint",
    nextLocked: "Finish the tasks to continue.",
    whereToFind: "Where to find it",
    findInSidebar: "In the sidebar: {name}",
    openRealPage: "Open the real page",
    openRealPageNote: "Your progress is saved. You can come back from Getting started in the sidebar.",
    drawerTitle: "All lessons",
    current: "Current",
    yourFocusShort: "Focus",
    noLessons: "There are no new lessons for you right now.",
    tryItNotice: "This is a practice version with made-up people.",
    practiceFailed: "This practice screen didn't load.",
    retry: "Try again",
    markDone: "Mark lesson as done",
    whatsNewIntro: "These lessons are new since you last went through Getting started.",
  },
  privacy: {
    title: "Privacy: who sees what",
    intro: "A plain summary for your role. It describes what people see in the app.",
    safetyTitle: "Every message passes a safety filter",
    safetyBody:
      "Messages are checked in English and Arabic before they are delivered. A message that breaks the school's rules is not sent, and the school is told.",
    items: {
      admin: [
        {
          title: "What admins can see",
          body: "Admins can see school records: users, attendance, grades, remarks, progress, leave requests and documents.",
        },
        {
          title: "Messages",
          body: "You read only the chats you are part of. The one exception is the text of blocked or flagged messages, which every admin can read in Message safety. Only the school's chat oversight account can read whole chats.",
        },
        {
          title: "The audit log",
          body: "The audit log records admin actions and some teacher and security events. Only admins can open it, and it shows the latest 200 entries. Sign-ins and messages are not recorded in it.",
        },
        {
          title: "Remarks and progress",
          body: "Remarks and behaviour entries, including negative ones, and progress comments are visible to the student and their parents.",
        },
        {
          title: "Sign-in security",
          body: "Admin accounts need a 15-character password and a second step with an authenticator app (yours is already set up). Each person can use up to 3 devices. Three wrong passwords in a row lock an account until an admin reactivates it; a locked admin account cannot be reactivated from Users.",
        },
      ],
      teacher: [
        {
          title: "What you can see",
          body: "You see the students of the classes you teach. Attendance you mark is visible to the other teachers of that class. Grades, remarks and progress comments you write can be read by you, admins, and the student and their parents.",
        },
        {
          title: "What students and parents see",
          body: "Students and their parents can read the attendance, grades, remarks and progress comments about the student. That includes negative remarks, so write them as you would say them to the family.",
        },
        {
          title: "Messages",
          body: "You can message your own students, their parents and admins. Teachers cannot message each other. Everyone in a chat sees its messages; nobody else does, except the school's chat oversight account. Admins can read the text of blocked or flagged messages.",
        },
        {
          title: "Sign-in security",
          body: "You change your password on first sign-in. After about two days, the app suggests adding a passkey once; you can say \"Maybe later\". Each person can use up to 3 devices, and three wrong passwords in a row lock the account until an admin reactivates it.",
        },
      ],
      student: [
        {
          title: "What you can see",
          body: "You see your own attendance, grades, assignments and timetable. You cannot see other students' grades or attendance, and they cannot see yours.",
        },
        {
          title: "Who else sees it",
          body: "Your parents and the school's admins see your attendance and grades. Remarks, including negative ones, and progress comments are visible to you and your parents.",
        },
        {
          title: "Messages",
          body: "You can message the teachers who teach you, and reply when a teacher or admin starts a chat. In a subject group, everyone in your class can read what you post. Messages pass a safety filter, and admins can read the text of blocked or flagged ones. Only the school's chat oversight account can read whole chats.",
        },
        {
          title: "Your account",
          body: "You are never forced to change your password or set up a second step. You can use up to 3 devices, and three wrong passwords in a row lock the account until an admin reactivates it, even if the next one is right.",
        },
      ],
      parent: [
        {
          title: "What you can see",
          body: "You see your own child's attendance, grades, remarks (including negative ones), progress comments, timetable and leave requests. You cannot see other children or other parents.",
        },
        {
          title: "Not told automatically",
          body: "The app does not send you a notification for grades, attendance, remarks or assignments. Check your Dashboard to see how your child is doing.",
        },
        {
          title: "Messages",
          body: "You can message the school's admins and your child's teachers. Only the people in a chat can read it, apart from the school's chat oversight account. Messages pass a safety filter, and admins can read the text of blocked or flagged ones.",
        },
        {
          title: "Sign-in security",
          body: "You change your password on first sign-in. Each person can use up to 3 devices, and three wrong passwords in a row lock the account until an admin reactivates it.",
        },
      ],
    },
  },
  finish: {
    title: "You're ready",
    intro: "Here is what you covered. You can reopen any lesson later from Getting started in the sidebar.",
    recap: "Lessons",
    recapDone: "{done} of {total} lessons done",
    notDone: "Not done yet",
    setupTitle: "Optional setup",
    push: {
      title: "Turn on notifications",
      body: "Get a notice on this device when there is a new message or announcement.",
      previewNote: "Available in the real app.",
    },
    phone: {
      title: "Add to your home screen",
      body: "Open this site in your phone's browser, then use the browser menu and choose Add to Home Screen. On iPhone, notifications work only from the home-screen app.",
    },
    passkey: {
      title: "Passkey (optional)",
      body: "A passkey lets you sign in with your fingerprint or face. The app will suggest it once after a couple of days, or you can add one in Settings.",
    },
    totp: {
      title: "Two-step sign-in is on",
      body: "Your authenticator app is already set up, so there is nothing more to do here.",
    },
    finishButton: "Finish",
    finishing: "Saving…",
    error: "We couldn't save that. Try again.",
    previewDone: "Preview finished. In the real app this saves your progress and opens your dashboard.",
  },
  banner: {
    withCount: "Finish getting started: {done} of {total} done",
    noCount: "Finish getting started",
    continue: "Continue",
    dismiss: "Dismiss for this page",
  },
};

export type FrameworkStrings = typeof en;

const ar: FrameworkStrings = {
  common: {
    continueLater: "أكمل لاحقًا",
    back: "رجوع",
    next: "التالي",
    finish: "إنهاء",
    close: "إغلاق",
    hint: "تلميح",
    hideHint: "إخفاء التلميح",
    lessonList: "كل الدروس",
    loading: "جارٍ التحميل…",
    previewNotice: "معاينة فقط: لا يُحفظ شيء هنا.",
    stepOf: "الخطوة {n} من {total}",
    skipToContent: "انتقل إلى المحتوى",
  },
  header: {
    title: "البدء",
    chapters: ["مرحبًا", "تطبيقك", "الدروس", "الخصوصية", "الإنهاء"],
    whatsNew: "الجديد",
    chapterLabel: "الفصل {n} من {total}: {name}",
  },
  welcome: {
    title: "مرحبًا بك في الكمال",
    intro:
      "أجب عن بضعة أسئلة سريعة، ثم تعرّف على تطبيقك، ثم جرّب كل جزء ببيانات تدريبية. لا شيء مما تفعله هنا حقيقي أو محفوظ، ويمكنك التوقف والمتابعة لاحقًا.",
    roleLine: {
      admin: "لقد سجّلت الدخول بصفتك مسؤولًا.",
      teacher: "لقد سجّلت الدخول بصفتك معلمًا.",
      student: "لقد سجّلت الدخول بصفتك طالبًا.",
      parent: "لقد سجّلت الدخول بصفتك وليّ أمر.",
    },
  },
  questions: {
    progress: "السؤال {n} من {total}",
    language: {
      title: "ما اللغة التي تفضّلها؟",
      hint: "يتغيّر التطبيق كله فورًا. يمكنك تغييرها لاحقًا من الإعدادات.",
      en: "English",
      ar: "العربية",
    },
    look: {
      title: "كيف تريد أن يبدو التطبيق؟",
      hint: "فاتح أو داكن. يمكنك تغييره لاحقًا من الإعدادات.",
      light: "فاتح",
      dark: "داكن",
    },
    device: {
      title: "ماذا تستخدم غالبًا؟",
      hint: "سنلائم الأمثلة والنصائح مع جهازك.",
      phone: "الهاتف",
      computer: "الحاسوب",
      both: "كلاهما",
    },
    level: {
      title: "ما مدى معرفتك بتطبيقات المدارس؟",
      hint: "هذا يغيّر مقدار المساعدة التي تحصل عليها. شاشات التدريب هي نفسها.",
      new: { label: "جديد على هذا", desc: "أظهر لي التلميحات أثناء التقدم." },
      some: { label: "استخدمت بعضها", desc: "التلميحات عند طلبها." },
      expert: { label: "مرتاح جدًا", desc: "اجعلها مختصرة." },
    },
    focus: {
      title: {
        admin: "ما الذي جئت لتفعله؟",
        teacher: "ما الذي ستفعله أكثر؟",
        student: "ما الذي تريد التحقق منه أولًا؟",
        parent: "ما الأهم بالنسبة لك؟",
      },
      hint: "اختر حتى {max}. ستأتي هذه الدروس أولًا وتُعلَّم على أنها اهتمامك.",
      limit: "يمكنك اختيار حتى {max}.",
      options: {
        attendance: { label: "الحضور", desc: "تسجيل الحضور أو الاطلاع عليه." },
        homework: { label: "الواجبات", desc: "المهام ومواعيد التسليم والتسليمات." },
        examsGrades: { label: "الاختبارات والدرجات", desc: "وضع الاختبارات وتسجيل العلامات." },
        messagingParents: { label: "مراسلة أولياء الأمور", desc: "التواصل مع أولياء الأمور والصفوف." },
        timetable: { label: "الجدول الدراسي", desc: "من يدرّس ماذا ومتى." },
        remarksProgress: { label: "الملاحظات والتقدم", desc: "ملاحظات السلوك والتقدم الشهري." },
        grades: { label: "الدرجات", desc: "العلامات ومستوى ابنك أو ابنتك." },
        messages: { label: "الرسائل", desc: "التواصل مع المعلمين والمدرسة." },
        eventsDocuments: { label: "الفعاليات والمستندات", desc: "التقويم المدرسي والملفات." },
        setup: { label: "إعداد الصفوف والأشخاص", desc: "المستخدمون والصفوف والمواد والجداول." },
        admissions: { label: "القبول", desc: "تسجيل الطلاب وأولياء الأمور الجدد." },
        approvals: { label: "الموافقات اليومية", desc: "طلبات الإجازة وإعادة تعيين كلمات المرور." },
        communication: { label: "التواصل", desc: "الإعلانات والفعاليات والرسائل." },
        oversight: { label: "الإشراف والسلامة", desc: "أمان الرسائل والتقدم وسجل التدقيق." },
      },
    },
  },
  glance: {
    title: "تطبيقك في لمحة",
    intro: "هذا هو شريطك الجانبي. كل درس يستغرق دقيقة أو دقيقتين. اختر أي عنصر للانتقال إليه مباشرة.",
    groups: {
      teaching: "التدريس",
      classLife: "حياة الصف",
      talking: "التواصل مع الناس",
      help: "المساعدة وحسابك",
      people: "الأشخاص والحسابات",
      setup: "إعداد المدرسة",
      comms: "التواصل",
      records: "السجلات وحسابك",
      today: "يومك الدراسي",
      school: "الحياة المدرسية",
      child: "ابنك أو ابنتك",
      more: "المزيد",
    },
  },
  lesson: {
    lessonOf: "الدرس {n} من {total}",
    yourFocus: "اهتمامك",
    done: "تم",
    whatItsFor: "فائدته",
    useWhen: "ستستخدمه عندما",
    whoCanSee: "من يستطيع رؤية هذا",
    seenBy: "يراه",
    notSeenBy: "لا يراه",
    tryIt: "جرّب بنفسك",
    tasks: "المهام",
    tasksDone: "أنجزت {done} من {total} مهام",
    taskDoneLabel: "تمت",
    showHint: "أظهر التلميح",
    nextLocked: "أنهِ المهام لتتابع.",
    whereToFind: "أين تجده",
    findInSidebar: "في الشريط الجانبي: {name}",
    openRealPage: "افتح الصفحة الحقيقية",
    openRealPageNote: "تم حفظ تقدمك. يمكنك العودة من «البدء» في الشريط الجانبي.",
    drawerTitle: "كل الدروس",
    current: "الحالي",
    yourFocusShort: "اهتمامك",
    noLessons: "لا توجد دروس جديدة لك الآن.",
    tryItNotice: "هذه نسخة تدريبية بأشخاص من وحي الخيال.",
    practiceFailed: "تعذّر تحميل شاشة التدريب هذه.",
    retry: "حاول مرة أخرى",
    markDone: "اعتبر الدرس مكتملًا",
    whatsNewIntro: "هذه الدروس جديدة منذ آخر مرة مررت فيها على «البدء».",
  },
  privacy: {
    title: "الخصوصية: من يرى ماذا",
    intro: "ملخص بسيط لدورك. يصف ما يراه الناس داخل التطبيق.",
    safetyTitle: "كل رسالة تمر عبر مرشّح السلامة",
    safetyBody:
      "تُفحص الرسائل بالإنجليزية والعربية قبل تسليمها. الرسالة التي تخالف قواعد المدرسة لا تُرسل، وتُبلَّغ المدرسة.",
    items: {
      admin: [
        {
          title: "ما يراه المسؤولون",
          body: "يستطيع المسؤولون رؤية سجلات المدرسة: المستخدمين والحضور والدرجات والملاحظات والتقدم وطلبات الإجازة والمستندات.",
        },
        {
          title: "الرسائل",
          body: "تقرأ المحادثات التي أنت طرف فيها فقط. الاستثناء الوحيد هو نص الرسائل المحظورة أو المُبلَّغ عنها، التي يستطيع كل مسؤول قراءتها في أمان الرسائل. حساب الإشراف على المحادثات في المدرسة وحده يستطيع قراءة المحادثات كاملة.",
        },
        {
          title: "سجل التدقيق",
          body: "يسجّل سجل التدقيق إجراءات المسؤولين وبعض أحداث المعلمين والأمان. المسؤولون وحدهم يفتحونه، ويعرض آخر 200 إدخال. لا تُسجَّل فيه عمليات تسجيل الدخول ولا الرسائل.",
        },
        {
          title: "الملاحظات والتقدم",
          body: "ملاحظات السلوك، بما فيها السلبية، وتعليقات التقدم تظهر للطالب ولوليّ أمره.",
        },
        {
          title: "أمان تسجيل الدخول",
          body: "تحتاج حسابات المسؤولين إلى كلمة مرور من 15 حرفًا وخطوة ثانية عبر تطبيق المصادقة (وقد أُعدّ لك بالفعل). يمكن لكل شخص استخدام 3 أجهزة. ثلاث كلمات مرور خاطئة متتالية تقفل الحساب إلى أن يعيد مسؤول تفعيله؛ ولا يمكن إعادة تفعيل حساب مسؤول مقفل من صفحة المستخدمين.",
        },
      ],
      teacher: [
        {
          title: "ما تراه",
          body: "ترى طلاب الصفوف التي تدرّسها. الحضور الذي تسجّله يراه معلمو ذلك الصف الآخرون. الدرجات والملاحظات وتعليقات التقدم التي تكتبها يقرؤها أنت والمسؤولون والطالب ووليّ أمره.",
        },
        {
          title: "ما يراه الطلاب وأولياء الأمور",
          body: "يستطيع الطلاب وأولياء أمورهم قراءة الحضور والدرجات والملاحظات وتعليقات التقدم الخاصة بالطالب. ويشمل ذلك الملاحظات السلبية، فاكتبها كما تقولها للعائلة.",
        },
        {
          title: "الرسائل",
          body: "يمكنك مراسلة طلابك وأولياء أمورهم والمسؤولين. لا يستطيع المعلمون مراسلة بعضهم. كل من في المحادثة يرى رسائلها ولا أحد غيرهم، عدا حساب الإشراف على المحادثات في المدرسة. ويستطيع المسؤولون قراءة نص الرسائل المحظورة أو المُبلَّغ عنها.",
        },
        {
          title: "أمان تسجيل الدخول",
          body: "تغيّر كلمة المرور عند أول تسجيل دخول. بعد يومين تقريبًا يقترح التطبيق مرة واحدة إضافة مفتاح مرور، ويمكنك اختيار «ربما لاحقًا». يمكن لكل شخص استخدام 3 أجهزة، وثلاث كلمات مرور خاطئة متتالية تقفل الحساب إلى أن يعيد مسؤول تفعيله.",
        },
      ],
      student: [
        {
          title: "ما تراه",
          body: "ترى حضورك ودرجاتك ومهامك وجدولك. لا يمكنك رؤية درجات الطلاب الآخرين أو حضورهم، ولا يستطيعون رؤية درجاتك أو حضورك.",
        },
        {
          title: "من يراه أيضًا",
          body: "يرى والداك ومسؤولو المدرسة حضورك ودرجاتك. الملاحظات، بما فيها السلبية، وتعليقات التقدم تظهر لك ولوالديك.",
        },
        {
          title: "الرسائل",
          body: "يمكنك مراسلة المعلمين الذين يدرّسونك، والرد عندما يبدأ معلم أو مسؤول محادثة. في مجموعة المادة، يقرأ كل من في صفك ما تنشره. تمر الرسائل عبر مرشّح السلامة، ويستطيع المسؤولون قراءة نص المحظورة أو المُبلَّغ عنها. حساب الإشراف على المحادثات في المدرسة وحده يستطيع قراءة المحادثات كاملة.",
        },
        {
          title: "حسابك",
          body: "لا يُطلب منك أبدًا تغيير كلمة المرور أو إعداد خطوة ثانية. يمكنك استخدام 3 أجهزة، وثلاث كلمات مرور خاطئة متتالية تقفل الحساب إلى أن يعيد مسؤول تفعيله، حتى لو كانت التالية صحيحة.",
        },
      ],
      parent: [
        {
          title: "ما تراه",
          body: "ترى حضور ابنك أو ابنتك ودرجاته وملاحظاته (بما فيها السلبية) وتعليقات التقدم والجدول وطلبات الإجازة. لا يمكنك رؤية الأطفال الآخرين ولا أولياء الأمور الآخرين.",
        },
        {
          title: "لا يُبلَّغ تلقائيًا",
          body: "لا يرسل التطبيق إشعارًا بالدرجات أو الحضور أو الملاحظات أو المهام. افتح لوحتك الرئيسية لترى كيف يسير ابنك أو ابنتك.",
        },
        {
          title: "الرسائل",
          body: "يمكنك مراسلة مسؤولي المدرسة ومعلمي ابنك أو ابنتك. لا يقرأ المحادثة إلا المشاركون فيها، عدا حساب الإشراف على المحادثات في المدرسة. تمر الرسائل عبر مرشّح السلامة، ويستطيع المسؤولون قراءة نص المحظورة أو المُبلَّغ عنها.",
        },
        {
          title: "أمان تسجيل الدخول",
          body: "تغيّر كلمة المرور عند أول تسجيل دخول. يمكن لكل شخص استخدام 3 أجهزة، وثلاث كلمات مرور خاطئة متتالية تقفل الحساب إلى أن يعيد مسؤول تفعيله.",
        },
      ],
    },
  },
  finish: {
    title: "أنت جاهز",
    intro: "هذا ما غطّيته. يمكنك إعادة فتح أي درس لاحقًا من «البدء» في الشريط الجانبي.",
    recap: "الدروس",
    recapDone: "أنجزت {done} من {total} دروس",
    notDone: "لم يُنجَز بعد",
    setupTitle: "إعداد اختياري",
    push: {
      title: "فعّل الإشعارات",
      body: "احصل على تنبيه على هذا الجهاز عند وصول رسالة أو إعلان جديد.",
      previewNote: "متاح في التطبيق الحقيقي.",
    },
    phone: {
      title: "أضِف التطبيق إلى الشاشة الرئيسية",
      body: "افتح هذا الموقع في متصفح هاتفك، ثم من قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية». على الآيفون تعمل الإشعارات فقط من التطبيق المضاف إلى الشاشة الرئيسية.",
    },
    passkey: {
      title: "مفتاح المرور (اختياري)",
      body: "يتيح لك مفتاح المرور تسجيل الدخول ببصمة الإصبع أو الوجه. سيقترحه التطبيق مرة واحدة بعد يومين تقريبًا، أو يمكنك إضافته من الإعدادات.",
    },
    totp: {
      title: "تسجيل الدخول بخطوتين مفعّل",
      body: "تطبيق المصادقة لديك مُعدّ بالفعل، فلا شيء آخر عليك فعله هنا.",
    },
    finishButton: "إنهاء",
    finishing: "جارٍ الحفظ…",
    error: "تعذّر الحفظ. حاول مرة أخرى.",
    previewDone: "انتهت المعاينة. في التطبيق الحقيقي يحفظ هذا تقدمك ويفتح لوحتك الرئيسية.",
  },
  banner: {
    withCount: "أكمل البدء: أنجزت {done} من {total}",
    noCount: "أكمل البدء",
    continue: "متابعة",
    dismiss: "إخفاء في هذه الصفحة",
  },
};

export const framework: Record<"en" | "ar", FrameworkStrings> = { en, ar };

export type FrameworkLocale = keyof typeof framework;

/** Replace {name} placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
