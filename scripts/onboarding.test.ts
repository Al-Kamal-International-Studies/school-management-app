// Checks the onboarding framework and lesson registry stay in step with the app.
// Run after changing the sidebar, a lesson, or src/lib/onboarding:
//   node scripts/onboarding.test.ts
//
// The registry is TypeScript/TSX that uses the "@/" alias, so a small in-process
// loader (module.registerHooks + the installed `typescript`) resolves "@/..."
// and transpiles .ts/.tsx on the fly. next/dynamic and server-only are stubbed;
// lazy practice components are never loaded.
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

/* ----------------------------- on-the-fly loader ----------------------------- */

const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function probe(base: string): string | null {
  if (path.extname(base) && fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const STUBS: Record<string, string> = {
  "next/dynamic": "data:text/javascript,export default function dynamic(loader){return {loader};}",
  "server-only": "data:text/javascript,export {};",
};

type ResolveCtx = { parentURL?: string };
type Resolved = { url: string; shortCircuit?: boolean; format?: string };
type Next<A, R> = (a: string, b?: A) => R;

const hooks = {
  resolve(specifier: string, context: ResolveCtx, nextResolve: Next<ResolveCtx, Resolved>): Resolved {
    const stub = STUBS[specifier];
    if (stub) return { url: stub, shortCircuit: true, format: "module" };
    let base: string | null = null;
    if (specifier.startsWith("@/")) base = path.join(SRC, specifier.slice(2));
    else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (base) {
      const found = probe(base);
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true, format: "module" };
    }
    return nextResolve(specifier, context);
  },
  load(url: string, context: unknown, nextLoad: Next<unknown, { source?: string | Buffer; format?: string }>) {
    if (url.startsWith("file:") && /\.(ts|tsx)$/.test(url)) {
      const file = fileURLToPath(url);
      const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
        fileName: file,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
        },
      });
      return { format: "module", source: out.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
};
(Module as unknown as { registerHooks: (h: typeof hooks) => void }).registerHooks(hooks);

const load = <T>(rel: string) => import(pathToFileURL(path.join(SRC, rel)).href) as Promise<T>;

/* ---------------------------------- helpers ---------------------------------- */

let fail = 0;
let passed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    return;
  }
  fail++;
  console.error(`FAIL ${name}${detail ? `\n  ${detail}` : ""}`);
}

type Role = "admin" | "teacher" | "student" | "parent";
const ROLES: Role[] = ["admin", "teacher", "student", "parent"];

interface LessonTextT {
  title: string;
  oneLiner: string;
  what: string[];
  useWhen: string;
  visibility: { seenBy: string[]; notSeenBy: string[]; note?: string };
  tasks: { id: string; label: string; hint: string }[];
  whereToFind: string;
}
interface LessonT {
  id: string;
  navHref: string;
  roles: Role[];
  focusTags: string[];
  since: number;
  text: { en: LessonTextT; ar: LessonTextT } | ((role: Role) => { en: LessonTextT; ar: LessonTextT });
  requiresOverseer?: boolean;
}

const nonEmpty = (s: unknown) => typeof s === "string" && s.trim().length > 0;

/** Sidebar hrefs per role, read from NAV_ITEMS in Sidebar.tsx (it is a client component with JSX and icons, so it is parsed rather than imported). */
function sidebarHrefs(): { byRole: Record<Role, string[]>; oversight: string } {
  const src = fs.readFileSync(path.join(SRC, "components/nav/Sidebar.tsx"), "utf8").replace(/\r\n/g, "\n");
  const start = src.indexOf("export const NAV_ITEMS");
  const end = src.indexOf("export const OVERSIGHT_ITEM");
  if (start < 0 || end < 0) throw new Error("NAV_ITEMS / OVERSIGHT_ITEM not exported from Sidebar.tsx");
  const block = src.slice(start, end);
  const byRole = {} as Record<Role, string[]>;
  for (const role of ROLES) {
    const m = new RegExp(`^  ${role}: \\[\\n([\\s\\S]*?)^  \\],`, "m").exec(block);
    byRole[role] = m ? [...m[1]!.matchAll(/href: "([^"]+)"/g)].map((x) => x[1]!) : [];
  }
  const o = /OVERSIGHT_ITEM[^=]*=\s*\{\s*href: "([^"]+)"/.exec(src.slice(end));
  return { byRole, oversight: o?.[1] ?? "" };
}

/* ------------------------------ registry vs sidebar ------------------------------ */

const { ALL_LESSONS, lessonsForRole, lessonTexts, orderLessons } = await load<{
  ALL_LESSONS: LessonT[];
  lessonsForRole: (role: Role, o: { canOverseeChats: boolean; sinceFloor?: number }) => LessonT[];
  lessonTexts: (l: LessonT, role: Role) => { en: LessonTextT; ar: LessonTextT };
  orderLessons: (l: LessonT[], focus: string[], navOrder: string[]) => LessonT[];
}>("lib/onboarding/registry.ts");

const { byRole, oversight } = sidebarHrefs();
check("oversight href parsed", oversight === "/admin/chat-oversight", `got "${oversight}"`);

for (const role of ROLES) {
  const hrefs = [...byRole[role], "/settings"];
  check(`${role}: sidebar parsed (>= 7 items)`, byRole[role].length >= 7, `got ${byRole[role].length}`);
  const mine = ALL_LESSONS.filter((l) => l.roles.includes(role));

  for (const href of hrefs) {
    const n = mine.filter((l) => l.navHref === href).length;
    check(`${role}: exactly one lesson for ${href}`, n === 1, `found ${n}`);
  }
  for (const l of mine) {
    const known = hrefs.includes(l.navHref);
    const overseerOk = role === "admin" && l.requiresOverseer === true && l.navHref === oversight;
    check(`${role}: lesson "${l.id}" points at a real sidebar href (${l.navHref})`, known || overseerOk);
  }
  const ids = mine.map((l) => l.id);
  check(`${role}: lesson ids unique`, new Set(ids).size === ids.length, `ids: ${ids.join(", ")}`);
  const overseerLessons = mine.filter((l) => l.requiresOverseer);
  check(`${role}: overseer lessons only for admin`, role === "admin" ? overseerLessons.length === 1 : overseerLessons.length === 0);
}

/* --------------------------------- lesson text --------------------------------- */

for (const l of ALL_LESSONS) {
  check(`lesson ${l.id}: roles not empty`, l.roles.length > 0);
  check(`lesson ${l.id}: since is an integer >= 10`, Number.isInteger(l.since) && l.since >= 10, `since=${l.since}`);
  for (const role of l.roles) {
    const label = `lesson ${role}/${l.id}`;
    const { en, ar } = lessonTexts(l, role);
    for (const [lang, t] of [["en", en], ["ar", ar]] as const) {
      const where = `${label} [${lang}]`;
      check(`${where}: title/oneLiner/useWhen/whereToFind`, [t.title, t.oneLiner, t.useWhen, t.whereToFind].every(nonEmpty));
      check(`${where}: what has text`, t.what.length > 0 && t.what.every(nonEmpty));
      check(`${where}: visibility lists`, t.visibility.seenBy.length > 0 && t.visibility.seenBy.every(nonEmpty) && t.visibility.notSeenBy.length > 0 && t.visibility.notSeenBy.every(nonEmpty));
      check(`${where}: at least one task, all fields set`, t.tasks.length > 0 && t.tasks.every((k) => nonEmpty(k.id) && nonEmpty(k.label) && nonEmpty(k.hint)));
      check(`${where}: task ids unique`, new Set(t.tasks.map((k) => k.id)).size === t.tasks.length);
    }
    check(
      `${label}: en and ar have the same task ids in the same order`,
      JSON.stringify(en.tasks.map((k) => k.id)) === JSON.stringify(ar.tasks.map((k) => k.id)),
      `en: ${en.tasks.map((k) => k.id)} / ar: ${ar.tasks.map((k) => k.id)}`,
    );
    check(`${label}: en and ar differ`, en.title !== ar.title || en.oneLiner !== ar.oneLiner);
  }
}

/* ------------------------- focus, ordering, what's new ------------------------- */

const { FOCUS_OPTIONS } = await load<{ FOCUS_OPTIONS: Record<Role, string[]> }>("lib/onboarding/config.ts");
for (const role of ROLES) {
  const visible = lessonsForRole(role, { canOverseeChats: true });
  for (const tag of FOCUS_OPTIONS[role]) {
    check(`${role}: focus option "${tag}" matches at least one lesson`, visible.some((l) => l.focusTags.includes(tag)));
  }
  // Same order the flow uses: Chat oversight sits right after Message safety.
  const sidebar = role === "admin" ? byRole.admin.flatMap((h) => (h === "/admin/message-safety" ? [h, oversight] : [h])) : byRole[role];
  const navOrder = [...sidebar, "/settings"];
  const focusTag = FOCUS_OPTIONS[role][0]!;
  const ordered = orderLessons(visible, [focusTag], navOrder);
  check(`${role}: ordering keeps every lesson`, ordered.length === visible.length);
  const firstMatching = ordered.findIndex((l) => l.focusTags.includes(focusTag));
  const lastMatching = ordered.map((l) => l.focusTags.includes(focusTag)).lastIndexOf(true);
  check(`${role}: focus lessons come first`, firstMatching === 0 && ordered.slice(0, lastMatching + 1).every((l) => l.focusTags.includes(focusTag)));
  const rest = ordered.filter((l) => !l.focusTags.includes(focusTag)).map((l) => navOrder.indexOf(l.navHref));
  check(`${role}: the rest is in sidebar order`, rest.every((v, i) => i === 0 || rest[i - 1]! <= v));
  check(`${role}: no lessons "since" > 10 hidden at floor 0`, lessonsForRole(role, { canOverseeChats: true, sinceFloor: 0 }).length === visible.length);
  check(`${role}: what's new at floor 10 shows only lessons newer than 10`, lessonsForRole(role, { canOverseeChats: true, sinceFloor: 10 }).every((l) => l.since > 10));
  check(`${role}: what's new at floor 11 shows nothing yet`, lessonsForRole(role, { canOverseeChats: true, sinceFloor: 11 }).length === 0);
  check(`${role}: overseer lesson hidden without canOverseeChats`, lessonsForRole(role, { canOverseeChats: false }).every((l) => !l.requiresOverseer));
}

type VersionProfile = { role: Role; has_seen_tour: boolean; tour_version_seen: number };
const { ONBOARDING_VERSION, ROLE_ONBOARDING_VERSION, needsOnboarding, lessonsSinceFloor, floorForVisit } = await load<{
  ONBOARDING_VERSION: number;
  ROLE_ONBOARDING_VERSION: Record<Role, number>;
  needsOnboarding: (p: VersionProfile) => boolean;
  lessonsSinceFloor: (p: { has_seen_tour: boolean; tour_version_seen: number }) => number;
  floorForVisit: (p: VersionProfile) => number;
}>("lib/onboarding/version.ts");
check("ONBOARDING_VERSION is 11", ONBOARDING_VERSION === 11);
check("needsOnboarding: never seen", needsOnboarding({ role: "teacher", has_seen_tour: false, tour_version_seen: 10 }));
check("needsOnboarding: old tour version", needsOnboarding({ role: "teacher", has_seen_tour: true, tour_version_seen: 4 }));
check("needsOnboarding: up to date", !needsOnboarding({ role: "teacher", has_seen_tour: true, tour_version_seen: ONBOARDING_VERSION }));
// Each role is only "behind" when a lesson for that role is newer than what
// they saw, so a version bump for one role's lesson never sends another role
// to an empty "what's new".
for (const role of ROLES) {
  const newest = Math.max(...lessonsForRole(role, { canOverseeChats: true }).map((l) => l.since));
  check(`${role}: ROLE_ONBOARDING_VERSION matches its newest lesson`, ROLE_ONBOARDING_VERSION[role] === newest);
  const behind = needsOnboarding({ role, has_seen_tour: true, tour_version_seen: 10 });
  const hasNewer = lessonsForRole(role, { canOverseeChats: true, sinceFloor: 10 }).length > 0;
  check(`${role}: a v10 finisher is behind exactly when a newer lesson exists`, behind === hasNewer);
}
check("ONBOARDING_VERSION is the newest role version", ONBOARDING_VERSION === Math.max(...ROLES.map((r) => ROLE_ONBOARDING_VERSION[r])));
check("parent who finished v10 is not sent back (no new parent lesson)", !needsOnboarding({ role: "parent", has_seen_tour: true, tour_version_seen: 10 }));
check("lessonsSinceFloor: old tour users see everything", lessonsSinceFloor({ has_seen_tour: true, tour_version_seen: 4 }) === 0);
check("lessonsSinceFloor: v10 finishers see only newer", lessonsSinceFloor({ has_seen_tour: true, tour_version_seen: 10 }) === 10);
check("lessonsSinceFloor: first timers see everything", lessonsSinceFloor({ has_seen_tour: false, tour_version_seen: 10 }) === 0);

// A finished, up-to-date user replaying from the sidebar gets the full flow;
// only someone who is behind (seen >= 10 but < current) gets "what's new".
const finishedUser = { role: "teacher" as Role, has_seen_tour: true, tour_version_seen: ONBOARDING_VERSION };
check("floorForVisit: finished user gets floor 0 (full flow)", floorForVisit(finishedUser) === 0);
for (const role of ROLES) {
  const full = lessonsForRole(role, { canOverseeChats: true, sinceFloor: floorForVisit(finishedUser) });
  check(`${role}: finished user replay lists every lesson`, full.length === lessonsForRole(role, { canOverseeChats: true }).length && full.length > 0);
}
// A user who saw version 10 while the current version is later. Lessons are
// tagged with `since`; simulate one newer lesson by comparing against the floor.
const behindUser = { role: "teacher" as Role, has_seen_tour: true, tour_version_seen: ONBOARDING_VERSION - 1 };
const behindFloor = floorForVisit(behindUser);
if (ONBOARDING_VERSION - 1 >= 10) {
  check("floorForVisit: behind user gets their seen version as floor", behindFloor === ONBOARDING_VERSION - 1);
  for (const role of ROLES) {
    const newer = lessonsForRole(role, { canOverseeChats: true, sinceFloor: behindFloor });
    check(`${role}: behind user sees only newer lessons`, newer.every((l) => l.since > behindFloor));
  }
} else {
  check("floorForVisit: pre-v10 user sees everything (floor 0)", behindFloor === 0);
}
check("floorForVisit: first timer gets floor 0", floorForVisit({ role: "teacher", has_seen_tour: false, tour_version_seen: 10 }) === 0);

/* ------------------------------ framework strings ------------------------------ */

const { framework } = await load<{ framework: { en: unknown; ar: unknown } }>("lib/onboarding/i18n/framework.ts");

function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`, ...value.flatMap((v, i) => keyPaths(v, `${prefix}[${i}]`))];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}
function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(leafStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(leafStrings);
  return [];
}
const enKeys = keyPaths(framework.en).sort();
const arKeys = keyPaths(framework.ar).sort();
check(
  "framework.ts: en and ar have identical keys",
  JSON.stringify(enKeys) === JSON.stringify(arKeys),
  `only in en: ${enKeys.filter((k) => !arKeys.includes(k)).join(", ")} | only in ar: ${arKeys.filter((k) => !enKeys.includes(k)).join(", ")}`,
);
check("framework.ts: no empty strings", leafStrings(framework.en).every(nonEmpty) && leafStrings(framework.ar).every(nonEmpty));
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
const enLeaves = leafStrings(framework.en);
const arLeaves = leafStrings(framework.ar);
check(
  "framework.ts: placeholders match between en and ar",
  enLeaves.length === arLeaves.length && enLeaves.every((s, i) => placeholders(s) === placeholders(arLeaves[i]!)),
);

/* ------------------------------- import boundaries ------------------------------- */

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}
const FLOW_SHELL = path.join(SRC, "components/onboarding/OnboardingFlow.tsx");
const ALLOWED_ACTIONS = "@/lib/onboarding/actions";
for (const file of walk(path.join(SRC, "components/onboarding"))) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  const specs = [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g)].map((m) => m[1]!);
  for (const spec of specs) {
    check(`${rel}: no supabase import (${spec})`, !spec.startsWith("@/lib/supabase") && !spec.startsWith("@supabase/"));
    const isActions = /(^|\/)actions(\.ts)?$/.test(spec) || /(^|\/)[\w-]*actions$/.test(spec);
    if (isActions) {
      check(`${rel}: only the flow shell imports ${ALLOWED_ACTIONS} (${spec})`, spec === ALLOWED_ACTIONS && file === FLOW_SHELL);
    }
    check(`${rel}: no server-only import (${spec})`, spec !== "server-only" && spec !== "@/lib/auth");
  }
}

/* --------------------------- return path + session flags --------------------------- */

{
  const st = await load<{
    safeReturnPath: (n: string | null | undefined) => string | null;
    gettingStartedHref: (n: string | null | undefined) => string;
    clearSessionFlags: () => void;
    sessionKey: (id: string) => string;
    storageKey: (id: string) => string;
  }>("lib/onboarding/storage.ts");

  const okPaths = ["/teacher/attendance?class=7A#today", "/messages", "/admin/users?q=omar"];
  for (const p of okPaths) check(`safeReturnPath keeps ${p}`, st.safeReturnPath(p) === p);
  const badPaths = [null, "", "https://evil.example/x", "//evil.example", "/\\evil.example", "/x\u0000y", "teacher", "/getting-started", "/getting-started?next=/a", "/getting-started/x"];
  for (const p of badPaths) check(`safeReturnPath refuses ${JSON.stringify(p)}`, st.safeReturnPath(p) === null);
  check("gettingStartedHref encodes the return path", st.gettingStartedHref("/teacher/attendance?class=7A") === "/getting-started?next=%2Fteacher%2Fattendance%3Fclass%3D7A");
  check("gettingStartedHref drops unsafe paths", st.gettingStartedHref("//evil.example") === "/getting-started");

  // Fake browser storage: sign-out/sign-in clears the per-session flags only.
  const mk = () => {
    const m = new Map<string, string>();
    const o: Record<string, unknown> = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    };
    return new Proxy(o, { ownKeys: () => [...m.keys()], getOwnPropertyDescriptor: (_t, k) => (m.has(String(k)) ? { enumerable: true, configurable: true, value: m.get(String(k)) } : Object.getOwnPropertyDescriptor(o, k)) }) as unknown as Storage & { getItem(k: string): string | null };
  };
  const g = globalThis as unknown as { window?: unknown };
  const prev = g.window;
  const session = mk();
  const local = mk();
  g.window = { sessionStorage: session, localStorage: local };
  session.setItem(st.sessionKey("u1"), "1");
  session.setItem(st.sessionKey("u2"), "1");
  session.setItem("unrelated", "keep");
  local.setItem(st.storageKey("u1"), "{}");
  st.clearSessionFlags();
  check("clearSessionFlags removes every onboarding session flag", session.getItem(st.sessionKey("u1")) === null && session.getItem(st.sessionKey("u2")) === null);
  check("clearSessionFlags leaves other session keys", session.getItem("unrelated") === "keep");
  check("clearSessionFlags keeps saved progress", local.getItem(st.storageKey("u1")) === "{}");
  g.window = prev;

  const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");
  check("sign-out clears the onboarding session flags", /clearSessionFlags\(\)/.test(read("components/nav/SignOutForm.tsx")));
  check("the sign-in page clears the onboarding session flags", /clearSessionFlags\(\)/.test(read("app/login/LoginForm.tsx")));
  check("the gate passes the original page as ?next=", /gettingStartedHref\(path \+ search \+ hash\)/.test(read("components/onboarding/OnboardingGate.tsx")));
  const flow = read("components/onboarding/OnboardingFlow.tsx");
  check("Continue later and Finish use the return path", /router\.push\(exitPath\)/.test(flow) && /window\.location\.assign\(exitPath\)/.test(flow) && !/DASHBOARD_PATH\[role\]\)/.test(flow.replace("returnTo ?? DASHBOARD_PATH[role]", "")));
}

/* ------------------------------ autosave status ------------------------------ */

{
  const st = await load<{
    writeProgress: (id: string, p: unknown) => boolean;
    lastSaveOk: () => boolean;
    subscribeSaveStatus: (fn: () => void) => () => void;
    emptyProgress: () => unknown;
  }>("lib/onboarding/storage.ts");
  const g = globalThis as unknown as { window?: unknown };
  const prev = g.window;
  let blocked = false;
  const m = new Map<string, string>();
  g.window = {
    localStorage: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (blocked) throw new Error("QuotaExceededError");
        m.set(k, v);
      },
      removeItem: (k: string) => void m.delete(k),
    },
  };
  let calls = 0;
  const off = st.subscribeSaveStatus(() => calls++);
  check("save status starts ok", st.lastSaveOk() === true);
  blocked = true;
  check("a failed autosave returns false", st.writeProgress("u1", st.emptyProgress()) === false);
  check("save status turns false after a failed write", st.lastSaveOk() === false && calls === 1);
  st.writeProgress("u1", st.emptyProgress());
  check("a second failure does not re-notify", calls === 1);
  blocked = false;
  check("a later write succeeds", st.writeProgress("u1", st.emptyProgress()) === true);
  check("save status recovers after a successful write", st.lastSaveOk() === true && calls === 2);
  off();
  g.window = prev;

  const flow = fs.readFileSync(path.join(SRC, "components/onboarding/OnboardingFlow.tsx"), "utf8");
  check("the saved label follows the autosave status", /useSyncExternalStore\(subscribeSaveStatus, lastSaveOk/.test(flow) && /progressSaved=\{progressSaved\}/.test(flow));
  const practice = fs.readFileSync(path.join(SRC, "components/onboarding/lessons/shared/MessagesPractice.tsx"), "utf8");
  check("group practice reaches Read after Delivered", /setTick\("read"\), direct \? \d+ : \d+/.test(practice));
  const script = fs.readFileSync(path.join(ROOT, "scripts/onboarding-test-account.mjs"), "utf8");
  check("account script marks fixtures and checks the marker before reset/delete", /app_metadata: \{ fixture: FIXTURE \}/.test(script) && /app_metadata\?\.fixture === FIXTURE/.test(script) && /if \(!mine\) done\(1/.test(script));
  check("account script has no admin role", !/ROLES = \[[^\]]*admin/.test(script));
}

/* ------------------- progress survives a lesson-release bump (Jack F1) ------------------- */

{
  type P = { v: 1; base: number; position: { chapter: string; question: number; lessonId: string | null }; tasks: Record<string, string[]>; completed: string[]; total: number };
  const st = await load<{
    storageKey: (id: string) => string;
    readRaw: (id: string) => string | null;
    writeProgress: (id: string, p: unknown) => boolean;
    clearProgress: (id: string) => void;
    emptyProgress: (base?: number) => P;
    parseProgress: (raw: string | null) => P | null;
    progressForRun: (raw: string | null, base: number) => P | null;
    LEGACY_STORAGE_KEYS: (id: string) => string[];
  }>("lib/onboarding/storage.ts");
  const g = globalThis as unknown as { window?: unknown };
  const prev = g.window;
  let blocked = false;
  const m = new Map<string, string>();
  g.window = {
    localStorage: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (blocked) throw new Error("QuotaExceededError");
        m.set(k, v);
      },
      removeItem: (k: string) => void m.delete(k),
    },
  };
  const legacyKey = (id: string) => `onboarding:v10:${id}`;
  // A real v10 record (no `base` field), as the live app wrote it before v11.
  const v10Record = (lessonId: string, completed: string[]) =>
    JSON.stringify({ v: 1, answers: { focus: [] }, position: { chapter: "lessons", question: 0, lessonId }, tasks: Object.fromEntries(completed.map((c) => [c, ["t"]])), completed, total: 9, updatedAt: 1 });

  check("the progress key no longer carries the lesson-release version", !st.storageKey("u").includes(`v${ONBOARDING_VERSION}`) && st.storageKey("u") === st.storageKey("u"));
  check("the v10 key is a known legacy key", st.LEGACY_STORAGE_KEYS("u").includes(legacyKey("u")));

  // Unfinished first-time users (base 0) of every role keep their v10 work.
  const firstLesson: Record<Role, string> = { admin: "overview", teacher: "my-classes", student: "dashboard", parent: "dashboard" };
  for (const role of ["teacher", "student", "parent"] as Role[]) {
    m.clear();
    const id = `${role}-1`;
    m.set(legacyKey(id), v10Record("messages", ["messages", firstLesson[role]]));
    const run = st.progressForRun(st.readRaw(id), 0);
    check(`${role}: unfinished v10 progress is read after the bump`, !!run && run.completed.includes("messages") && run.position.lessonId === "messages");
    check(`${role}: the new CambriLearn lesson is not marked done by old progress`, !!run && !run.completed.includes("cambrilearn") && !(run.tasks["cambrilearn"] ?? []).length);
    check(`${role}: legacy data is kept until a new write succeeds`, m.has(legacyKey(id)) && !m.has(st.storageKey(id)));
    blocked = true;
    check(`${role}: a denied write fails and keeps the legacy data`, st.writeProgress(id, run) === false && m.has(legacyKey(id)));
    blocked = false;
    check(`${role}: a successful write moves progress to the new key`, st.writeProgress(id, run) === true && m.has(st.storageKey(id)) && !m.has(legacyKey(id)));
    const again = st.progressForRun(st.readRaw(id), 0);
    check(`${role}: moved progress still resumes`, !!again && again.completed.includes("messages") && again.base === 0);
  }
  check("parent: no CambriLearn lesson to resume into", !lessonsForRole("parent", { canOverseeChats: false }).some((l) => l.id === "cambrilearn"));

  // Finished v10 accounts: "what's new" (base 10) shows only the new lesson and
  // ignores any leftover first-run record, so old completion can't satisfy it.
  for (const role of ["teacher", "student"] as Role[]) {
    m.clear();
    const id = `${role}-done`;
    m.set(legacyKey(id), v10Record("cambrilearn", ["cambrilearn", "messages"]));
    const newOnly = lessonsForRole(role, { canOverseeChats: false, sinceFloor: lessonsSinceFloor({ has_seen_tour: true, tour_version_seen: 10 }) });
    check(`${role}: finished v10 gets exactly the CambriLearn lesson`, newOnly.length === 1 && newOnly[0]!.id === "cambrilearn");
    check(`${role}: a leftover first-run record is ignored by "what's new"`, st.progressForRun(st.readRaw(id), 10) === null);
    check(`${role}: and by a full replay after finishing (base 10)`, st.progressForRun(st.readRaw(id), 10) === null);
  }
  check("parent: finished v10 is not sent back", !needsOnboarding({ role: "parent", has_seen_tour: true, tour_version_seen: 10 }));

  // Current progress wins over legacy.
  m.clear();
  m.set(legacyKey("c"), v10Record("messages", ["messages"]));
  m.set(st.storageKey("c"), JSON.stringify({ ...st.emptyProgress(0), position: { chapter: "lessons", question: 0, lessonId: "calendar" }, completed: ["calendar"] }));
  const cur = st.progressForRun(st.readRaw("c"), 0);
  check("valid current progress takes precedence over legacy", !!cur && cur.position.lessonId === "calendar" && !cur.completed.includes("messages"));

  // Malformed legacy fails safely (fresh start, no throw).
  m.clear();
  m.set(legacyKey("bad"), "{not json");
  check("malformed legacy progress yields a fresh start", st.progressForRun(st.readRaw("bad"), 0) === null);
  m.set(legacyKey("bad"), JSON.stringify({ v: 1, position: { chapter: "nowhere" } }));
  check("legacy with an unknown chapter yields a fresh start", st.progressForRun(st.readRaw("bad"), 0) === null);

  // Finishing clears both keys, so v10 can never be reloaded afterwards.
  m.clear();
  m.set(legacyKey("f"), v10Record("messages", ["messages"]));
  st.writeProgress("f", st.emptyProgress(0));
  m.set(legacyKey("f"), v10Record("messages", ["messages"]));
  st.clearProgress("f");
  check("finish clears current and legacy progress (no resurrection)", st.readRaw("f") === null && !m.has(legacyKey("f")));
  check("records written now carry their run base", st.parseProgress(JSON.stringify(st.emptyProgress(10)))?.base === 10);
  check("records without a base are first-run records", st.parseProgress(v10Record("x", []))?.base === 0);
  g.window = prev;

  const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");
  const flow = read("components/onboarding/OnboardingFlow.tsx");
  check("the flow reads progress for its own run", /progressForRun\(raw, progressBase\)/.test(flow) && /emptyProgress\(progressBase\)/.test(flow));
  check("getting-started passes the run base", /progressBase=\{lessonsSinceFloor\(profile\)\}/.test(read("app/(onboarding)/getting-started/page.tsx")));
  check("the banner counts progress for the right run", /progressForRun\(raw, lessonsSinceFloor\(profile\)\)/.test(read("components/onboarding/OnboardingGate.tsx")));
}

/* ----------------------------------- result ----------------------------------- */

if (fail) {
  console.error(`\n${fail} check(s) failed, ${passed} passed.`);
  process.exit(1);
}
console.log(`onboarding: all ${passed} checks passed (${ALL_LESSONS.length} lessons).`);
