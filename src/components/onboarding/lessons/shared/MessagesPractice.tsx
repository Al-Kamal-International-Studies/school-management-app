"use client";

import "@/components/chat/chat.css";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/chat/icons";
import { ChatAvatar, senderColor } from "@/components/chat/parts";
import { PracticeFrame } from "@/components/onboarding/practice/kit";
import type { OnboardingLocale, PracticeProps } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import { pick, ROLE_LABEL } from "./l10n";
import { buildScenario, type Chat, type Msg, type Tick } from "./messagesData";
import { practiceFilterBlocks } from "./safetyWords";

type Filter = "all" | "unread" | "groups";

/** Same words as the real app's `messages.*` dictionary (English and Arabic). */
const UI = {
  en: {
    title: "Messages",
    newChat: "New chat",
    search: "Search people and chats",
    searchPeople: "Search people",
    all: "All",
    unread: "Unread",
    groups: "Groups",
    chats: "Chats",
    directory: "Directory",
    people: "People",
    noConversations: "No conversations yet.",
    noResults: "No matches.",
    noContacts: "No one to message yet.",
    typeMessage: "Type a message…",
    send: "Send",
    back: "Back to chats",
    selectChat: "Choose a chat, or tap + to start one.",
    today: "Today",
    members: "{count} members",
    taughtBy: "Taught by {teacher}",
    noMessagesYet: "No messages yet",
    noMessages: "No messages yet — say hello.",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    blocked: "This message can't be sent. It breaks the school's messaging rules, and the school has been notified.",
    nav: "Messages navigation",
    tipsTitle: "Practice tips",
  },
  ar: {
    title: "الرسائل",
    newChat: "محادثة جديدة",
    search: "ابحث عن أشخاص ومحادثات",
    searchPeople: "ابحث عن أشخاص",
    all: "الكل",
    unread: "غير مقروءة",
    groups: "المجموعات",
    chats: "المحادثات",
    directory: "الدليل",
    people: "الأشخاص",
    noConversations: "لا توجد محادثات بعد.",
    noResults: "لا توجد نتائج.",
    noContacts: "لا يوجد أحد لمراسلته بعد.",
    typeMessage: "اكتب رسالة…",
    send: "إرسال",
    back: "العودة إلى المحادثات",
    selectChat: "اختر محادثة، أو اضغط + لبدء محادثة.",
    today: "اليوم",
    members: "الأعضاء: {count}",
    taughtBy: "يدرّسها {teacher}",
    noMessagesYet: "لا توجد رسائل بعد",
    noMessages: "لا توجد رسائل بعد — ابدأ بالتحية.",
    sent: "أُرسلت",
    delivered: "وصلت",
    read: "قُرئت",
    blocked: "لا يمكن إرسال هذه الرسالة لأنها تخالف قواعد المراسلة في المدرسة، وقد تم إبلاغ المدرسة.",
    nav: "التنقل في الرسائل",
    tipsTitle: "نصائح للتدريب",
  },
} as const;

/** Who the person can message, shown under the practice screen (the real rules, per role). */
const RULES: Record<UserRole, { en: string[]; ar: string[] }> = {
  admin: {
    en: ["You can start a chat with anyone in the school.", "You can reply in chats you started.", "Admins are not members of the subject groups, so the Groups tab stays empty."],
    ar: ["يمكنك بدء محادثة مع أي شخص في المدرسة.", "يمكنك الرد في المحادثات التي بدأتها.", "المدراء ليسوا أعضاء في مجموعات المواد، لذلك تبقى تبويبة المجموعات فارغة."],
  },
  teacher: {
    en: ["You can start a chat with admins, the students you teach, and their parents.", "Other teachers are not in your Directory.", "Your class subject groups appear under Groups."],
    ar: ["يمكنك بدء محادثة مع المدراء والطلاب الذين تدرّسهم وأولياء أمورهم.", "المعلمون الآخرون غير موجودين في الدليل.", "تظهر مجموعات المواد لصفوفك تحت «المجموعات»."],
  },
  student: {
    en: ["You can start a chat only with the teachers who teach you.", "Classmates, parents and management are not in your Directory.", "You can reply when an admin starts a chat with you."],
    ar: ["يمكنك بدء محادثة مع المعلمين الذين يدرّسونك فقط.", "زملاء الصف وأولياء الأمور والإدارة غير موجودين في الدليل.", "يمكنك الرد عندما يبدأ أحد المدراء محادثة معك."],
  },
  parent: {
    en: ["You can start a chat with your child's teachers and with admins.", "Other parents, students and teachers who don't teach your child are not in your Directory.", "You are not in the subject groups."],
    ar: ["يمكنك بدء محادثة مع معلمي ابنك ومع المدراء.", "أولياء الأمور الآخرون والطلاب والمعلمون الذين لا يدرّسون ابنك غير موجودين في الدليل.", "لست عضوًا في مجموعات المواد."],
  },
};

const NEW_TIPS = {
  en: ["Press the + button to open the Directory and pick someone.", "Type a message and press Enter (or the send button).", "To see the safety filter, type the practice word idiot and send it."],
  ar: ["اضغط زر + لفتح الدليل واختيار شخص.", "اكتب رسالة ثم اضغط Enter (أو زر الإرسال).", "لرؤية فلتر الأمان، اكتب كلمة التدريب idiot ثم أرسلها."],
};

function fmtTime(locale: OnboardingLocale) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function TickMark({ tick, variant, label }: { tick: Tick; variant: "bubble" | "list"; label: string }) {
  return (
    <span title={label} className={`ch-tick ch-tick-${variant} is-${tick}`}>
      <span className="sr-only">{label}</span>
      <Icon name={tick === "sent" ? "tick-single" : "tick"} size={variant === "list" ? 17 : 16} />
    </span>
  );
}

export default function MessagesPractice({ role, locale, dir, level, completeTask }: PracticeProps) {
  const ui = UI[locale];
  const scenario = useMemo(() => buildScenario(role), [role]);
  const [chats, setChats] = useState<Chat[]>(scenario.chats);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [panelQuery, setPanelQuery] = useState("");
  const [text, setText] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const counter = useRef(100);
  const scroller = useRef<HTMLDivElement>(null);
  const panelBack = useRef<HTMLButtonElement>(null);
  const newChatBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (panelOpen) panelBack.current?.focus();
  }, [panelOpen]);

  const active = chats.find((c) => c.id === activeId) ?? null;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.msgs.length, activeId]);

  const nameOf = (id: string) => pick(scenario.people[id] ?? "—", locale);

  function openChat(id: string) {
    setActiveId(id);
    setBanner(null);
    setText("");
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    if (chats.find((c) => c.id === id)?.kind === "group") completeTask("group");
  }

  function openContact(id: string) {
    const existing = chats.find((c) => c.otherId === id);
    setPanelOpen(false);
    setPanelQuery("");
    setQuery("");
    completeTask("directory");
    if (existing) {
      openChat(existing.id);
      return;
    }
    const contact = scenario.contacts.find((c) => c.id === id);
    if (!contact) return;
    const chat: Chat = { id: `d-${id}`, kind: "direct", title: contact.name, otherId: id, unread: 0, stamp: "", msgs: [] };
    setChats((prev) => [chat, ...prev]);
    setFilter("all");
    setActiveId(chat.id);
    setBanner(null);
    setText("");
  }

  function send() {
    const content = text.trim();
    if (!content || !active) return;
    setText("");
    if (practiceFilterBlocks(content)) {
      setBanner(ui.blocked);
      completeTask("blocked");
      return;
    }
    setBanner(null);
    const id = `m${counter.current++}`;
    const chatId = active.id;
    const direct = active.kind === "direct";
    const time = fmtTime(locale);
    const msg: Msg = { id, from: "me", text: content, time, tick: "sent" };
    setChats((prev) => {
      const cur = prev.find((c) => c.id === chatId);
      if (!cur) return prev;
      return [{ ...cur, msgs: [...cur.msgs, msg], stamp: time }, ...prev.filter((c) => c.id !== chatId)];
    });
    completeTask("send");
    const setTick = (tick: Tick) =>
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, msgs: c.msgs.map((m) => (m.id === id ? { ...m, tick } : m)) } : c)));
    timers.current.push(setTimeout(() => setTick("delivered"), 900));
    if (direct) timers.current.push(setTimeout(() => setTick("read"), 2100));
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !coarse) {
      e.preventDefault();
      send();
    }
  }

  const q = query.trim().toLowerCase();
  const unreadChats = chats.filter((c) => c.unread > 0).length;
  const groupCount = chats.filter((c) => c.kind === "group").length;
  const lastOf = (c: Chat) => c.msgs[c.msgs.length - 1];
  const visible = chats.filter((c) => {
    const last = lastOf(c);
    const hay = `${pick(c.title, locale)} ${last ? pick(last.text, locale) : ""}`.toLowerCase();
    return (!q || hay.includes(q)) && (filter === "all" || (filter === "unread" ? c.unread > 0 : c.kind === "group"));
  });
  const searchPeople = q ? scenario.contacts.filter((c) => !chats.some((i) => i.otherId === c.id) && pick(c.name, locale).toLowerCase().includes(q)) : [];
  const pq = panelQuery.trim().toLowerCase();
  const panelGroups = (["admin", "teacher", "student", "parent"] as const)
    .map((r) => ({ role: r, people: scenario.contacts.filter((c) => c.role === r && (!pq || pick(c.name, locale).toLowerCase().includes(pq))) }))
    .filter((g) => g.people.length > 0);

  function openPanel() {
    setPanelQuery("");
    setPanelOpen(true);
  }
  function closePanel() {
    setPanelOpen(false);
    requestAnimationFrame(() => newChatBtn.current?.focus());
  }

  function preview(c: Chat) {
    const last = lastOf(c);
    if (!last) return <span>{c.kind === "group" && c.subtitle ? ui.taughtBy.replace("{teacher}", pick(c.subtitle, locale)) : ui.noMessagesYet}</span>;
    const mine = last.from === "me";
    const body = pick(last.text, locale);
    const sender = c.kind === "group" && !mine ? nameOf(last.from).split(" ")[0] : null;
    return (
      <>
        {mine && <TickMark tick="sent" variant="list" label={ui.sent} />}
        <bdi dir="auto">{sender ? `${sender}: ${body}` : body}</bdi>
      </>
    );
  }

  const search = (value: string, onChange: (v: string) => void, placeholder: string, id: string) => (
    <div className="ch-search">
      <Icon name="search" />
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoComplete="off" />
    </div>
  );

  const personRow = (id: string) => {
    const c = scenario.contacts.find((x) => x.id === id)!;
    return (
      <li key={c.id}>
        <button type="button" className="ch-row" onClick={() => openContact(c.id)}>
          <ChatAvatar name={pick(c.name, locale)} />
          <span className="ch-row-mid">
            <span className="ch-line">
              <span className="ch-name">{pick(c.name, locale)}</span>
            </span>
            <span className="ch-line">
              <span className="ch-preview">
                <span>{pick(c.context, locale)}</span>
              </span>
            </span>
          </span>
        </button>
      </li>
    );
  };

  const rules = RULES[role][locale];
  const tips = NEW_TIPS[locale];
  const otherRole = active ? scenario.contacts.find((c) => c.id === active.otherId)?.role ?? "admin" : "admin";

  return (
    <PracticeFrame locale={locale} dir={dir} title={ui.title}>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-navy-700">
        <div className="ch-frame" style={{ height: 520, minHeight: 0, maxWidth: "none", margin: 0, border: 0, borderRadius: 0 }}>
          <div className="ch-app" data-open={active ? "true" : "false"}>
            <nav className="ch-rail" aria-label={ui.nav}>
              <button
                type="button"
                className={`ch-rail-btn${!panelOpen && filter !== "groups" ? " is-active" : ""}`}
                title={ui.chats}
                aria-label={ui.chats}
                aria-pressed={!panelOpen && filter !== "groups"}
                onClick={() => {
                  setPanelOpen(false);
                  setFilter("all");
                }}
              >
                <Icon name="chat" />
                {unreadChats > 0 && <span className="ch-dot" aria-hidden />}
              </button>
              <button
                type="button"
                className={`ch-rail-btn${!panelOpen && filter === "groups" ? " is-active" : ""}`}
                title={ui.groups}
                aria-label={ui.groups}
                aria-pressed={!panelOpen && filter === "groups"}
                onClick={() => {
                  setPanelOpen(false);
                  setFilter("groups");
                }}
              >
                <Icon name="grp" />
              </button>
              <button type="button" className={`ch-rail-btn${panelOpen ? " is-active" : ""}`} title={ui.directory} aria-label={ui.directory} aria-pressed={panelOpen} onClick={openPanel}>
                <Icon name="dir" />
              </button>
            </nav>

            <aside className="ch-list">
              <div className="ch-list-head" inert={panelOpen}>
                <h4 className="ch-title">{ui.title}</h4>
                <button ref={newChatBtn} type="button" className="ch-icon-btn is-solid" aria-label={ui.newChat} title={ui.newChat} onClick={openPanel}>
                  <Icon name="plus" />
                </button>
              </div>

              <div inert={panelOpen}>{search(query, setQuery, ui.search, "practice-chat-search")}</div>

              <div className="ch-chips" role="tablist" inert={panelOpen} aria-label={ui.chats}>
                {(
                  [
                    ["all", ui.all, 0],
                    ["unread", ui.unread, unreadChats],
                    ["groups", ui.groups, groupCount],
                  ] as const
                ).map(([f, label, count]) => (
                  <button key={f} type="button" role="tab" className="ch-chip" aria-selected={filter === f} onClick={() => setFilter(f)}>
                    {label}
                    {count > 0 && <i>{count}</i>}
                  </button>
                ))}
              </div>

              <div className="ch-rows ch-scroll" inert={panelOpen}>
                <ul aria-label={ui.chats}>
                  {visible.map((c) => {
                    const last = lastOf(c);
                    return (
                      <li key={c.id}>
                        <button type="button" className="ch-row" aria-current={c.id === activeId ? "true" : undefined} onClick={() => openChat(c.id)}>
                          <ChatAvatar name={pick(c.title, locale)} group={c.kind === "group"} />
                          <span className="ch-row-mid">
                            <span className="ch-line">
                              <span className="ch-name">
                                <bdi>{pick(c.title, locale)}</bdi>
                              </span>
                              {last && <span className={`ch-stamp${c.unread ? " is-unread" : ""}`}>{pick(c.stamp, locale)}</span>}
                            </span>
                            <span className="ch-line">
                              <span className="ch-preview">{preview(c)}</span>
                              {c.unread > 0 && <span className="ch-badge">{c.unread}</span>}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {visible.length === 0 && searchPeople.length === 0 && <p className="ch-none">{q || filter === "unread" ? ui.noResults : ui.noConversations}</p>}
                {searchPeople.length > 0 && (
                  <section aria-label={ui.people}>
                    <p className="ch-section">{ui.people}</p>
                    <ul>{searchPeople.map((c) => personRow(c.id))}</ul>
                  </section>
                )}
              </div>

              {panelOpen && (
                <section className="ch-panel" aria-label={ui.newChat}>
                  <div className="ch-panel-head">
                    <button ref={panelBack} type="button" className="ch-icon-btn ch-flip" aria-label={ui.back} onClick={closePanel}>
                      <Icon name="arrow-left" />
                    </button>
                    <h5 className="ch-panel-title">{ui.newChat}</h5>
                  </div>
                  {search(panelQuery, setPanelQuery, ui.searchPeople, "practice-chat-panel-search")}
                  <div className="ch-rows ch-scroll">
                    {panelGroups.length === 0 && <p className="ch-none">{pq ? ui.noResults : ui.noContacts}</p>}
                    {panelGroups.map((g) => (
                      <section key={g.role} aria-label={pick(ROLE_LABEL[g.role], locale)}>
                        <p className="ch-section">{pick(ROLE_LABEL[g.role], locale)}</p>
                        <ul>{g.people.map((c) => personRow(c.id))}</ul>
                      </section>
                    ))}
                  </div>
                </section>
              )}
            </aside>

            {active ? (
              <section className="ch-pane" aria-label={pick(active.title, locale)}>
                <header className="ch-head">
                  <button type="button" aria-label={ui.back} className="ch-icon-btn ch-flip ch-only-narrow" style={{ marginInlineStart: -6 }} onClick={() => setActiveId(null)}>
                    <Icon name="arrow-left" />
                  </button>
                  <ChatAvatar name={pick(active.title, locale)} group={active.kind === "group"} size="sm" />
                  <div className="ch-head-title">
                    <b>
                      <bdi>{pick(active.title, locale)}</bdi>
                    </b>
                    <span>{active.kind === "group" ? ui.members.replace("{count}", String(active.members ?? 0)) : pick(ROLE_LABEL[otherRole], locale)}</span>
                  </div>
                </header>

                <div className="ch-stage">
                  <div ref={scroller} className="ch-wall ch-scroll" role="log" aria-live="polite">
                    {active.msgs.length === 0 ? <p className="ch-nomsg">{ui.noMessages}</p> : <div className="ch-date">{ui.today}</div>}
                    {active.msgs.map((m, i) => {
                      const prev = active.msgs[i - 1];
                      const mine = m.from === "me";
                      const sameRun = prev?.from === m.from;
                      const sender = active.kind === "group" && !mine && !sameRun ? nameOf(m.from) : null;
                      return (
                        <div key={m.id} className={`ch-msg ${mine ? "out" : "in"}${sameRun ? "" : " tail"}`}>
                          {sender && (
                            <span className="ch-sender" style={{ color: senderColor(m.from) }}>
                              {sender}
                            </span>
                          )}
                          <div className="ch-msg-row">
                            <div className="ch-msg-body">
                              <bdi dir="auto" className="ch-msg-text">
                                {pick(m.text, locale)}
                              </bdi>
                            </div>
                            <small className="ch-meta">
                              <time>{pick(m.time, locale)}</time>
                              {mine && m.tick && <TickMark tick={m.tick} variant="bubble" label={ui[m.tick]} />}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="ch-composer-wrap">
                  {banner && (
                    <p role="alert" className="ch-banner">
                      {banner}
                    </p>
                  )}
                  <form
                    className="ch-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      send();
                    }}
                  >
                    <label htmlFor="practice-chat-input" className="sr-only">
                      {ui.typeMessage}
                    </label>
                    <textarea
                      id="practice-chat-input"
                      rows={1}
                      value={text}
                      maxLength={4000}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={onKey}
                      placeholder={ui.typeMessage}
                      dir="auto"
                      className="ch-input"
                    />
                    <button type="submit" className="ch-send ch-flip" aria-label={ui.send} title={ui.send} disabled={!text.trim()}>
                      <Icon name="send" />
                    </button>
                  </form>
                </div>
              </section>
            ) : (
              <div className="ch-empty ch-wallpaper">
                <span className="ch-empty-icon">
                  <Icon name="chat" size={26} />
                </span>
                <p>{ui.selectChat}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ul className="list-disc space-y-1 ps-5 text-sm text-slate-600 dark:text-navy-200">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {level === "new" && (
        <div className="rounded-lg border border-navy-200 bg-navy-50 px-3.5 py-3 text-sm text-navy-900 dark:border-navy-400/30 dark:bg-navy-500/15 dark:text-navy-100">
          <p className="font-medium">{ui.tipsTitle}</p>
          <ul className="mt-1 list-disc space-y-1 ps-5">
            {tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </PracticeFrame>
  );
}
