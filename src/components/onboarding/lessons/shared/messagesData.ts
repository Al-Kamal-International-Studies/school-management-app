import { FakePeople, type FakeEntity } from "@/components/onboarding/practice/kit";
import type { UserRole } from "@/lib/types/database.types";
import { FAKE_ADMIN, type L } from "./l10n";

export type Tick = "sent" | "delivered" | "read";

export interface Contact {
  id: string;
  role: UserRole;
  name: L;
  context: L;
}
export interface Msg {
  id: string;
  /** "me" or a person id from `people`. */
  from: string;
  text: L | string;
  time: L | string;
  tick?: Tick;
}
export interface Chat {
  id: string;
  kind: "direct" | "group";
  title: L;
  subtitle?: L;
  otherId?: string;
  members?: number;
  unread: number;
  stamp: L | string;
  msgs: Msg[];
}
export interface Scenario {
  contacts: Contact[];
  chats: Chat[];
  people: Record<string, L>;
}

const S = FakePeople.students;
const P = FakePeople.parents;
const T = FakePeople.teachers;
const cls7a: L = FakePeople.classes[0]!;
const e = (x: FakeEntity): L => ({ en: x.en, ar: x.ar });

const adminContact: Contact = { id: FAKE_ADMIN.id, role: "admin", name: e(FAKE_ADMIN), context: { en: "Admin", ar: "مدير" } };
const parentCtx: L = { en: "Parent", ar: "ولي أمر" };

const teacherSubject: Record<string, L> = {
  t1: { en: "Mathematics", ar: "الرياضيات" },
  t2: { en: "Science", ar: "العلوم" },
  t3: { en: "English", ar: "اللغة الإنجليزية" },
};

const everyone: Record<string, L> = Object.fromEntries([...S, ...P, ...T, FAKE_ADMIN].map((x) => [x.id, e(x)]));

const mathGroupTitle: L = { en: `${FakePeople.classes[0]!.en} · Mathematics`, ar: `${FakePeople.classes[0]!.ar} · الرياضيات` };
const sciGroupTitle: L = { en: `${FakePeople.classes[0]!.en} · Science`, ar: `${FakePeople.classes[0]!.ar} · العلوم` };
const taughtBy = (t: FakeEntity): L => e(t);

/** What each role sees in its own practice inbox, following the real messaging rules. */
export function buildScenario(role: UserRole): Scenario {
  if (role === "admin") {
    return {
      people: everyone,
      contacts: [
        ...T.map((t): Contact => ({ id: t.id, role: "teacher", name: e(t), context: teacherSubject[t.id]! })),
        ...S.slice(0, 3).map((s): Contact => ({ id: s.id, role: "student", name: e(s), context: cls7a })),
        ...P.slice(0, 2).map((p): Contact => ({ id: p.id, role: "parent", name: e(p), context: parentCtx })),
      ],
      chats: [
        {
          id: "d-t1",
          kind: "direct",
          title: e(T[0]!),
          otherId: "t1",
          unread: 1,
          stamp: { en: "9:41 AM", ar: "9:41 ص" },
          msgs: [
            { id: "m1", from: "me", text: { en: "Good morning. Please send me the Class 7A timetable changes.", ar: "صباح الخير. أرسلي لي من فضلك تعديلات جدول الصف 7أ." }, time: { en: "9:30 AM", ar: "9:30 ص" }, tick: "read" },
            { id: "m2", from: "t1", text: { en: "Good morning. I will send them before noon.", ar: "صباح النور. سأرسلها قبل الظهر." }, time: { en: "9:41 AM", ar: "9:41 ص" } },
          ],
        },
      ],
    };
  }

  if (role === "teacher") {
    return {
      people: everyone,
      contacts: [
        adminContact,
        ...S.slice(0, 3).map((s): Contact => ({ id: s.id, role: "student", name: e(s), context: cls7a })),
        ...P.slice(0, 2).map((p): Contact => ({ id: p.id, role: "parent", name: e(p), context: parentCtx })),
      ],
      chats: [
        {
          id: "g-math",
          kind: "group",
          title: mathGroupTitle,
          subtitle: taughtBy(T[0]!),
          members: 7,
          unread: 1,
          stamp: { en: "9:12 AM", ar: "9:12 ص" },
          msgs: [
            { id: "m1", from: "me", text: { en: "Homework is on page 12.", ar: "الواجب في الصفحة 12." }, time: { en: "9:05 AM", ar: "9:05 ص" }, tick: "delivered" },
            { id: "m2", from: "s1", text: { en: "Thank you, Miss.", ar: "شكرًا يا أستاذة." }, time: { en: "9:12 AM", ar: "9:12 ص" } },
          ],
        },
        {
          id: "d-a1",
          kind: "direct",
          title: e(FAKE_ADMIN),
          otherId: "a1",
          unread: 0,
          stamp: { en: "Yesterday", ar: "أمس" },
          msgs: [{ id: "m1", from: "a1", text: { en: "Please send the term plan when it is ready.", ar: "أرسلي خطة الفصل عندما تكون جاهزة من فضلك." }, time: { en: "4:20 PM", ar: "4:20 م" } }],
        },
      ],
    };
  }

  if (role === "student") {
    return {
      people: everyone,
      contacts: [
        { id: "t1", role: "teacher", name: e(T[0]!), context: teacherSubject.t1! },
        { id: "t2", role: "teacher", name: e(T[1]!), context: teacherSubject.t2! },
      ],
      chats: [
        {
          id: "g-math",
          kind: "group",
          title: mathGroupTitle,
          subtitle: taughtBy(T[0]!),
          members: 7,
          unread: 1,
          stamp: { en: "9:12 AM", ar: "9:12 ص" },
          msgs: [
            { id: "m1", from: "t1", text: { en: "Homework is on page 12.", ar: "الواجب في الصفحة 12." }, time: { en: "9:05 AM", ar: "9:05 ص" } },
            { id: "m2", from: "s2", text: { en: "Thank you, Miss.", ar: "شكرًا يا أستاذة." }, time: { en: "9:12 AM", ar: "9:12 ص" } },
          ],
        },
        {
          id: "g-sci",
          kind: "group",
          title: sciGroupTitle,
          subtitle: taughtBy(T[1]!),
          members: 7,
          unread: 0,
          stamp: { en: "Yesterday", ar: "أمس" },
          msgs: [{ id: "m1", from: "t2", text: { en: "Please bring a ruler tomorrow.", ar: "أحضروا مسطرة غدًا من فضلكم." }, time: { en: "2:10 PM", ar: "2:10 م" } }],
        },
        {
          id: "d-a1",
          kind: "direct",
          title: e(FAKE_ADMIN),
          otherId: "a1",
          unread: 1,
          stamp: { en: "8:55 AM", ar: "8:55 ص" },
          msgs: [{ id: "m1", from: "a1", text: { en: "Please bring the signed trip form tomorrow.", ar: "أحضر نموذج الرحلة الموقّع غدًا من فضلك." }, time: { en: "8:55 AM", ar: "8:55 ص" } }],
        },
      ],
    };
  }

  // parent
  return {
    people: everyone,
    contacts: [
      { id: "t1", role: "teacher", name: e(T[0]!), context: { en: "Teaches Omar · Mathematics", ar: "تدرّس عمر · الرياضيات" } },
      { id: "t2", role: "teacher", name: e(T[1]!), context: { en: "Teaches Omar · Science", ar: "يدرّس عمر · العلوم" } },
      adminContact,
    ],
    chats: [],
  };
}
