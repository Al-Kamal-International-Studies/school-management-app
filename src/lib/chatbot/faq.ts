// ============================================================================
// Scoped, rule-based answer engine for the in-app help chatbot.
//
// Deliberately NOT a general-purpose AI — no external API calls, so nothing
// a user types ever leaves this app. It answers a fixed set of "how do I
// use this app" questions (tailored per role — teacher / student / parent),
// handles ordinary small talk so a conversation feels natural, and refuses
// anything that smells like a request for sensitive data (other people's
// records, credentials, financial/internal information).
// ============================================================================

import type { UserRole } from "@/lib/types/database.types";

export type ChatRole = Extract<UserRole, "teacher" | "student" | "parent">;

const REFUSAL =
  "I can't help with that — I'm only able to answer questions about using this app (your own account and, if you're a parent, your linked child's records). For anything else, please contact your school administrator.";

const FALLBACK =
  "I'm not sure about that one. I can help with things like: timetable, attendance, assignments, exams, grades, progress, leave requests, the calendar, documents, messaging, feedback, or your account settings. Try asking about one of those!";

type Answer = string | ((role: ChatRole) => string);

interface Rule {
  keywords: string[];
  answer: Answer;
}

function resolve(answer: Answer, role: ChatRole): string {
  return typeof answer === "function" ? answer(role) : answer;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary matching, not naive substring — a naive `.includes("hi")`
// would false-positive on the word "this" (contains "hi"), "help" on
// "helpful", etc. This is a real bug the original naive-substring version
// had; fixed here.
function textMatches(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(text);
}

function forRole(role: ChatRole, opts: { teacher: string; student: string; parent: string }): string {
  return opts[role];
}

// Checked first, and win regardless of any FAQ match on the same message.
const SENSITIVE_RULES: Rule[] = [
  {
    keywords: [
      "password of", "someone else", "other student", "other teacher", "another student",
      "another teacher", "other parent", "another parent", "other child", "another child",
      "classmate's", "admin credentials", "admin password",
      "database", "api key", "supabase", "backend", "server", "source code",
      "salary", "revenue", "profit", "budget", "financial statement", "how much does the school make",
      "investor", "business plan", "bank account", "social security", "ssn", "passport number",
      "phone number of", "address of", "email of",
    ],
    answer: REFUSAL,
  },
];

const FAQ_RULES: Rule[] = [
  {
    keywords: ["who are you", "what are you", "your name"],
    answer:
      "I'm your in-app assistant — here to help you find your way around Al Kamal International Studies' school management app. Ask me about your timetable, attendance, grades, or your account.",
  },
  {
    keywords: ["timetable", "schedule", "what class", "what time", "next class", "today's class", "today class"],
    answer: (role) =>
      forRole(role, {
        teacher:
          "You can see your full weekly teaching timetable from “My Timetable” in the sidebar. Today's classes are also shown right on your dashboard.",
        student:
          "You can see your full weekly timetable from “My Timetable” in the sidebar. Today's classes are also shown right on your dashboard.",
        parent:
          "The parent portal doesn't show the full class timetable yet — but you can see your child's upcoming exams and assignment due dates right on their dashboard. For the full weekly schedule, please contact the school office.",
      }),
  },
  {
    keywords: ["attendance", "absent", "present", "how many days"],
    answer: (role) =>
      forRole(role, {
        teacher:
          "Mark attendance for your classes from “Attendance” in the sidebar — pick a class and date, then set each student to present, absent, late, or excused.",
        student: "You can see your attendance history and overall attendance rate from “Attendance” in the sidebar.",
        parent: "Your child's attendance rate is shown right on their dashboard in the parent portal.",
      }),
  },
  {
    keywords: ["assignment", "homework"],
    answer: (role) =>
      forRole(role, {
        teacher: "Create and grade assignments from “Assignments” in the sidebar.",
        student:
          "See your assignments from “Assignments” in the sidebar, and mark one as submitted once you've turned it in — your teacher will grade it there too.",
        parent: "Upcoming assignments and due dates for your child are listed right on their dashboard.",
      }),
  },
  {
    keywords: ["exam", "quiz", "test date", "upcoming test"],
    answer: (role) =>
      forRole(role, {
        teacher: "Schedule exams and quizzes for your classes from “Exams” in the sidebar.",
        student: "See upcoming exams and quizzes from “Exams” in the sidebar.",
        parent: "Upcoming exams for your child are listed right on their dashboard.",
      }),
  },
  {
    keywords: ["grade", "grades", "marks", "report card", "exam result", "my score"],
    answer: (role) =>
      forRole(role, {
        teacher: "Record grades for an assessment from “Grades” in the sidebar — pick the student and subject, then enter the marks.",
        student: "See your recorded grades from “Grades” in the sidebar.",
        parent: "Your child's recent grades are shown right on their dashboard.",
      }),
  },
  {
    keywords: ["progress", "progress score", "progress ring", "overall score"],
    answer: (role) =>
      forRole(role, {
        teacher:
          "Submit a student's monthly progress (attendance, homework, participation, behaviour, assessments, and subject understanding) from “Progress” in the sidebar.",
        student: "Your overall progress score and monthly trend are shown right on your dashboard.",
        parent: "Your child's overall progress score for the month is shown right on their dashboard.",
      }),
  },
  {
    keywords: ["remark", "behaviour", "behavior", "conduct", "discipline"],
    answer: (role) =>
      forRole(role, {
        teacher: "Add a remark or log a behaviour note for a student from “Remarks & Behaviour” in the sidebar.",
        student: "Any remarks or behaviour notes your teachers add for you show up right on your dashboard.",
        parent: "Teacher remarks and behaviour notes for your child appear right on their dashboard.",
      }),
  },
  {
    keywords: ["leave", "absence", "excuse", "sick day", "time off"],
    answer: (role) =>
      forRole(role, {
        teacher: "Leave requests are submitted by students (or their parent) and reviewed by the school admin — you don't need to do anything for those.",
        student: "Submit a leave request from “Leave Requests” in the sidebar — you'll see whether it's pending, approved, or rejected right there.",
        parent: "You can submit a leave request for your child right from their dashboard, and see its status there too.",
      }),
  },
  {
    keywords: ["calendar", "holiday", "school event", "deadline"],
    answer: "Check “Calendar” in the sidebar for upcoming school events, holidays, and deadlines.",
  },
  {
    keywords: ["document", "admit card", "certificate", "policy", "report card download"],
    answer: "Download admit cards, report cards, certificates, or school policies from “Documents” in the sidebar.",
  },
  {
    keywords: ["message", "messaging", "dm", "direct message", "chat with my teacher", "chat with a teacher"],
    answer: (role) =>
      forRole(role, {
        teacher: "Message your students, their parents, or the school admin from “Messages” in the sidebar.",
        student: "Message your teachers or the school admin from “Messages” in the sidebar.",
        parent: "Message your child's teachers or the school admin from “Messages” in the sidebar.",
      }),
  },
  {
    keywords: ["feedback", "suggestion", "report a bug", "report an issue"],
    answer: "Share a suggestion or report an issue from “Feedback” in the sidebar — pick a category, add a subject and message, and submit.",
  },
  {
    keywords: ["notification", "push notification", "enable notifications", "alerts"],
    answer: "Turn on push notifications from “Settings” in the sidebar — you'll get an alert for new announcements and messages.",
  },
  {
    keywords: ["dark mode", "light mode", "theme", "dark theme"],
    answer: "Switch between light and dark mode from “Settings” in the sidebar.",
  },
  {
    keywords: ["language", "arabic", "عربي", "switch language", "change language"],
    answer: "Switch the app's language between English and العربية from “Settings” in the sidebar.",
  },
  {
    keywords: ["change my password", "reset my password", "forgot my password", "forgot password", "update my password"],
    answer:
      "You can set a new password anytime from “Settings” in the sidebar. If you're signed out and can't remember your current one, use “Forgot password?” on the sign-in page instead.",
  },
  {
    keywords: ["profile picture", "profile photo", "avatar", "change my photo", "upload photo"],
    answer: "Go to “My Profile” (click your name/photo in the top bar), then click your avatar to upload a new photo. JPG, PNG, or WEBP under 4MB.",
  },
  {
    keywords: ["update my phone", "change my phone", "change my number", "update my name", "change my name"],
    answer:
      "Go to “My Profile” (click your name/photo in the top bar) — you can edit your name and phone number there. Your email and date of birth can only be changed by your administrator.",
  },
  {
    keywords: ["my class", "my students", "which classes do i teach", "my subject"],
    answer: (role) =>
      forRole(role, {
        teacher: "You can see all your assigned classes and subjects on your dashboard, under “My Classes”.",
        student: "Your class and enrollment details are shown on your dashboard.",
        parent: "Your child's class is shown at the top of their dashboard in the parent portal.",
      }),
  },
  {
    keywords: ["my child", "switch child", "another child", "different child", "my children"],
    answer: (role) =>
      forRole(role, {
        teacher: "That's a question for a parent account — I'm set up to help with your teaching account here.",
        student: "That's a question for a parent account — I'm set up to help with your student account here.",
        parent:
          "If you have more than one child linked to your account, you'll see a row of name tabs at the top of the parent dashboard — tap a child's name to switch to their records.",
      }),
  },
  {
    keywords: ["contact admin", "contact school", "contact the office", "talk to a human", "talk to admin", "help from admin"],
    answer:
      "For anything I can't help with, please reach out to your school administrator directly — they can assist with account issues, records, and anything outside what I can answer here. You can also find the school's phone and email under “Settings” → “Contact Us”.",
  },
  {
    keywords: ["sign out", "log out", "logout"],
    answer: "Click “Sign out” in the top-right corner of the top bar to log out of your account.",
  },
  {
    keywords: ["what can you do", "how do i use this", "how does this work"],
    answer: (role) =>
      forRole(role, {
        teacher:
          "I can help with using this app as a teacher — attendance, assignments, exams, grades, progress, remarks, your timetable, messaging, or your account. What would you like to know?",
        student:
          "I can help with using this app as a student — your timetable, attendance, assignments, exams, grades, progress, leave requests, or your account. What would you like to know?",
        parent:
          "I can help with using the parent portal — your child's attendance, progress, grades, assignments, exams, leave requests, or your own account. What would you like to know?",
      }),
  },

  // ---- Small talk, so a conversation feels normal rather than robotic ----
  {
    keywords: ["good morning", "good afternoon", "good evening", "hello", "hi", "hey", "salam", "assalamu", "yo"],
    answer: (role) =>
      forRole(role, {
        teacher: "Hello! How can I help with your teaching account today?",
        student: "Hi there! What can I help you with in the app today?",
        parent: "Hello! Happy to help with anything on your child's dashboard or your account today.",
      }),
  },
  {
    keywords: ["how are you", "how's it going", "how you doing", "whats up", "what's up"],
    answer:
      "I'm doing well, thanks for asking! I'm here whenever you need a hand with the app — what can I help with?",
  },
  {
    keywords: ["thank", "thanks", "shukran", "appreciate it"],
    answer: "You're very welcome! Let me know if there's anything else about the app I can help with.",
  },
  {
    keywords: ["sorry", "my bad", "my mistake"],
    answer: "No worries at all! What can I help you with?",
  },
  {
    keywords: ["okay", "ok thanks", "sounds good", "got it", "alright", "cool", "great thanks", "perfect"],
    answer: "Great! Anything else I can help with?",
  },
  {
    keywords: ["bye", "goodbye", "see you", "see ya", "later", "have a good day", "have a nice day"],
    answer: "Goodbye! Come back anytime you have a question about the app. Have a great day!",
  },
  {
    keywords: ["are you real", "are you a robot", "are you human", "are you ai", "are you a bot"],
    answer:
      "I'm a scripted assistant built into this app, not a general AI — I only know how to answer questions about using this app, and I never send anything you type anywhere outside it.",
  },
  {
    keywords: ["joke", "tell me a joke", "make me laugh"],
    answer:
      "I'm better at timetables than punchlines, I'm afraid! But I'm always glad to help you find your way around the app.",
  },
];

/**
 * Returns the assistant's reply for a given user message, tailored to the
 * asker's role (teacher / student / parent). Sensitive-topic refusals are
 * role-independent and always checked first.
 */
export function getFaqAnswer(userMessage: string, role: ChatRole): string {
  const text = userMessage.toLowerCase();

  for (const rule of SENSITIVE_RULES) {
    if (rule.keywords.some((k) => textMatches(text, k))) return resolve(rule.answer, role);
  }
  for (const rule of FAQ_RULES) {
    if (rule.keywords.some((k) => textMatches(text, k))) return resolve(rule.answer, role);
  }
  return FALLBACK;
}
