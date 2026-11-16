import type { LessonText, LessonTexts } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";

type Tasks = LessonText["tasks"];

const taskDirectory = {
  en: { id: "directory", label: "Start a chat from the Directory", hint: "Press the + button (or the Directory icon), then press a person's name in the list." },
  ar: { id: "directory", label: "ابدأ محادثة من الدليل", hint: "اضغط زر + (أو أيقونة الدليل)، ثم اضغط اسم أحد الأشخاص في القائمة." },
};
const taskGroup = {
  en: { id: "group", label: "Open a subject group", hint: "Press the Groups tab, then press a group such as Mathematics." },
  ar: { id: "group", label: "افتح مجموعة مادة", hint: "اضغط تبويبة «المجموعات»، ثم اضغط إحدى المجموعات مثل الرياضيات." },
};
const taskSend = {
  en: { id: "send", label: "Send a normal message", hint: "Open a chat, type \"Thank you\" in the message box and press Send. Watch the ticks change." },
  ar: { id: "send", label: "أرسل رسالة عادية", hint: "افتح محادثة، واكتب «شكرًا لكم» في مربع الرسالة ثم اضغط إرسال. راقب تغيّر علامات الصح." },
};
const taskBlocked = {
  en: { id: "blocked", label: "See the safety filter stop a message", hint: "In an open chat, type the practice word idiot and press Send. The practice filter will stop it and show the school's warning." },
  ar: { id: "blocked", label: "شاهد فلتر الأمان وهو يوقف رسالة", hint: "في محادثة مفتوحة، اكتب كلمة التدريب idiot ثم اضغط إرسال. سيوقفها فلتر التدريب ويعرض تنبيه المدرسة." },
};

const whereEn = "Messages, in the sidebar. The chat icon in the top bar opens it too.";
const whereAr = "الرسائل، في القائمة الجانبية. وتفتحها أيضًا أيقونة المحادثة في الشريط العلوي.";

const safetyEn =
  "Every message is checked by the school's safety filter before it is delivered. A message that breaks the messaging rules is stopped and the school is told. A few borderline messages are delivered but sent to admins to review.";
const safetyAr =
  "يفحص فلتر الأمان في المدرسة كل رسالة قبل تسليمها. الرسالة التي تخالف قواعد المراسلة تُوقف ويُبلَّغ المدرسة. أما بعض الرسائل المشكوك فيها فتُسلَّم لكن تُرسل إلى المدراء لمراجعتها.";

const introEn =
  "Messages works like a chat app. Your chats are listed on the left, or fill the screen on a phone. Open one to read it and reply. Under each message you send, ticks show Sent, then Delivered, then Read.";
const introAr =
  "تعمل الرسائل مثل تطبيق المحادثة. تظهر محادثاتك في القائمة على الجانب، أو تملأ الشاشة على الهاتف. افتح محادثة لتقرأها وتردّ عليها. تحت كل رسالة ترسلها تظهر علامات صح: أُرسلت، ثم وصلت، ثم قُرئت.";

const oversightNoteEn = "Admins can read the text of blocked or flagged messages in Message safety. Only the school's oversight account can read whole chats.";
const oversightNoteAr = "يستطيع المدراء قراءة نص الرسائل التي أوقفها الفلتر أو علّمها في «أمان الرسائل». أما قراءة المحادثات كاملة فتقتصر على حساب الإشراف في المدرسة.";

interface Cfg {
  oneLinerEn: string;
  oneLinerAr: string;
  rulesEn: string;
  rulesAr: string;
  useWhenEn: string;
  useWhenAr: string;
  seenByEn: string[];
  seenByAr: string[];
  notSeenByEn: string[];
  notSeenByAr: string[];
  tasksEn: Tasks;
  tasksAr: Tasks;
}

const CFG: Record<UserRole, Cfg> = {
  teacher: {
    oneLinerEn: "Chat with parents, students and the office, and post to your class subject groups.",
    oneLinerAr: "راسل أولياء الأمور والطلاب والإدارة، وشارك في مجموعات المواد لصفوفك.",
    rulesEn:
      "You can start a chat with admins, with the students you teach, and with those students' parents. You can't start a chat with other teachers. For every class and subject you teach, you are also placed in a subject group with that class's students. Parents are not in these groups.",
    rulesAr:
      "يمكنك بدء محادثة مع المدراء ومع الطلاب الذين تدرّسهم ومع أولياء أمورهم. ولا يمكنك بدء محادثة مع معلمين آخرين. وفي كل صف ومادة تدرّسها تكون عضوًا في مجموعة المادة مع طلاب ذلك الصف. أولياء الأمور ليسوا في هذه المجموعات.",
    useWhenEn: "you need to tell a parent about homework, post a note to a whole class, or answer the office.",
    useWhenAr: "تريد إخبار ولي أمر بشأن الواجب، أو نشر ملاحظة لصف كامل، أو الرد على الإدارة.",
    seenByEn: ["The people in the chat", "Class members, for subject groups"],
    seenByAr: ["المشاركون في المحادثة", "أعضاء الصف، في مجموعات المواد"],
    notSeenByEn: ["Other teachers", "Other students and parents"],
    notSeenByAr: ["المعلمون الآخرون", "الطلاب وأولياء الأمور الآخرون"],
    tasksEn: [taskDirectory.en, taskGroup.en, taskSend.en, taskBlocked.en],
    tasksAr: [taskDirectory.ar, taskGroup.ar, taskSend.ar, taskBlocked.ar],
  },
  student: {
    oneLinerEn: "Message your teachers, reply to the office and talk in your subject groups.",
    oneLinerAr: "راسل معلميك، وردّ على الإدارة، وتحدّث في مجموعات موادك.",
    rulesEn:
      "You can start a chat only with the teachers who teach you. You can't start a new chat with classmates, parents or school management. If an admin starts a chat with you, you can reply. You are also a member of the group for each subject in your class, and everyone in the group can post.",
    rulesAr:
      "يمكنك بدء محادثة مع المعلمين الذين يدرّسونك فقط. ولا يمكنك بدء محادثة جديدة مع زملائك أو أولياء الأمور أو إدارة المدرسة. وإذا بدأ أحد المدراء محادثة معك فيمكنك الرد. وأنت أيضًا عضو في مجموعة كل مادة في صفك، ويستطيع كل أعضاء المجموعة الكتابة فيها.",
    useWhenEn: "you have a question about homework, want to reply to a teacher, or need to answer a message from the office.",
    useWhenAr: "لديك سؤال عن الواجب، أو تريد الرد على معلم، أو الإجابة عن رسالة من الإدارة.",
    seenByEn: ["The people in the chat", "Everyone in the group, for subject groups"],
    seenByAr: ["المشاركون في المحادثة", "كل أعضاء المجموعة، في مجموعات المواد"],
    notSeenByEn: ["Students who are not in the chat", "Other teachers and parents"],
    notSeenByAr: ["الطلاب غير المشاركين في المحادثة", "المعلمون وأولياء الأمور الآخرون"],
    tasksEn: [taskDirectory.en, taskGroup.en, taskSend.en, taskBlocked.en],
    tasksAr: [taskDirectory.ar, taskGroup.ar, taskSend.ar, taskBlocked.ar],
  },
  parent: {
    oneLinerEn: "Write to your child's teachers and to the school office.",
    oneLinerAr: "راسل معلمي ابنك ومكتب المدرسة.",
    rulesEn:
      "You can start a chat with the teachers of your child's class and with admins. You can't message other parents, students, or teachers who don't teach your child. Subject groups are for teachers and students, so you won't see them.",
    rulesAr:
      "يمكنك بدء محادثة مع معلمي صف ابنك ومع المدراء. ولا يمكنك مراسلة أولياء أمور آخرين أو طلاب أو معلمين لا يدرّسون ابنك. مجموعات المواد مخصصة للمعلمين والطلاب، لذلك لن تظهر لك.",
    useWhenEn: "you want to ask a teacher about your child's homework, or contact the office.",
    useWhenAr: "تريد سؤال معلم عن واجب ابنك، أو التواصل مع الإدارة.",
    seenByEn: ["The people in the chat"],
    seenByAr: ["المشاركون في المحادثة"],
    notSeenByEn: ["Other parents", "Students", "Teachers who are not in the chat"],
    notSeenByAr: ["أولياء الأمور الآخرون", "الطلاب", "المعلمون غير المشاركين في المحادثة"],
    tasksEn: [taskDirectory.en, taskSend.en, taskBlocked.en],
    tasksAr: [taskDirectory.ar, taskSend.ar, taskBlocked.ar],
  },
  admin: {
    oneLinerEn: "Start a chat with anyone in the school and reply to the people you wrote to.",
    oneLinerAr: "ابدأ محادثة مع أي شخص في المدرسة وردّ على من راسلتهم.",
    rulesEn:
      "As an admin you can start a chat with anyone in the school, and reply in the chats you started. Admins are not members of the subject groups, so you won't see group chats.",
    rulesAr:
      "بصفتك مديرًا يمكنك بدء محادثة مع أي شخص في المدرسة، والرد في المحادثات التي بدأتها. المدراء ليسوا أعضاء في مجموعات المواد، لذلك لن تظهر لك محادثات المجموعات.",
    useWhenEn: "you need to reach a teacher, a parent or a student directly.",
    useWhenAr: "تحتاج إلى التواصل مباشرة مع معلم أو ولي أمر أو طالب.",
    seenByEn: ["The people in the chat"],
    seenByAr: ["المشاركون في المحادثة"],
    notSeenByEn: ["Other admins", "Everyone else in the school"],
    notSeenByAr: ["المدراء الآخرون", "بقية أفراد المدرسة"],
    tasksEn: [taskDirectory.en, taskSend.en, taskBlocked.en],
    tasksAr: [taskDirectory.ar, taskSend.ar, taskBlocked.ar],
  },
};

export function messagesText(role: UserRole): LessonTexts {
  const c = CFG[role];
  const safetyAdminEn =
    "Every message is checked by the safety filter. When it stops or flags a message, admins get an alert and can read that message's text in Message safety. Admins can't read other people's chats; only the school's single oversight account can read whole chats.";
  const safetyAdminAr =
    "يفحص فلتر الأمان كل رسالة. وعندما يوقف رسالة أو يعلّمها يصل تنبيه إلى المدراء ويمكنهم قراءة نصها في «أمان الرسائل». لا يستطيع المدراء قراءة محادثات الآخرين، فحساب الإشراف الوحيد في المدرسة هو الذي يقرأ المحادثات كاملة.";
  const isAdmin = role === "admin";
  return {
    en: {
      title: "Messages",
      oneLiner: c.oneLinerEn,
      what: [introEn, c.rulesEn, isAdmin ? safetyAdminEn : safetyEn],
      useWhen: c.useWhenEn,
      visibility: { seenBy: c.seenByEn, notSeenBy: c.notSeenByEn, note: oversightNoteEn },
      tasks: c.tasksEn,
      whereToFind: whereEn,
    },
    ar: {
      title: "الرسائل",
      oneLiner: c.oneLinerAr,
      what: [introAr, c.rulesAr, isAdmin ? safetyAdminAr : safetyAr],
      useWhen: c.useWhenAr,
      visibility: { seenBy: c.seenByAr, notSeenBy: c.notSeenByAr, note: oversightNoteAr },
      tasks: c.tasksAr,
      whereToFind: whereAr,
    },
  };
}
