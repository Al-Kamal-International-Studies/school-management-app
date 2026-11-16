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
  check(`${role}: what's new at floor 10 shows nothing yet`, lessonsForRole(role, { canOverseeChats: true, sinceFloor: 10 }).length === 0);
  check(`${role}: overseer lesson hidden without canOverseeChats`, lessonsForRole(role, { canOverseeChats: false }).every((l) => !l.requiresOverseer));
}

const { ONBOARDING_VERSION, needsOnboarding, lessonsSinceFloor } = await load<{
  ONBOARDING_VERSION: number;
  needsOnboarding: (p: { has_seen_tour: boolean; tour_version_seen: number }) => boolean;
  lessonsSinceFloor: (p: { has_seen_tour: boolean; tour_version_seen: number }) => number;
}>("lib/onboarding/version.ts");
check("ONBOARDING_VERSION is 10", ONBOARDING_VERSION === 10);
check("needsOnboarding: never seen", needsOnboarding({ has_seen_tour: false, tour_version_seen: 10 }));
check("needsOnboarding: old tour version", needsOnboarding({ has_seen_tour: true, tour_version_seen: 4 }));
check("needsOnboarding: up to date", !needsOnboarding({ has_seen_tour: true, tour_version_seen: ONBOARDING_VERSION }));
check("lessonsSinceFloor: old tour users see everything", lessonsSinceFloor({ has_seen_tour: true, tour_version_seen: 4 }) === 0);
check("lessonsSinceFloor: v10 finishers see only newer", lessonsSinceFloor({ has_seen_tour: true, tour_version_seen: 10 }) === 10);
check("lessonsSinceFloor: first timers see everything", lessonsSinceFloor({ has_seen_tour: false, tour_version_seen: 10 }) === 0);

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

/* ----------------------------------- result ----------------------------------- */

if (fail) {
  console.error(`\n${fail} check(s) failed, ${passed} passed.`);
  process.exit(1);
}
console.log(`onboarding: all ${passed} checks passed (${ALL_LESSONS.length} lessons).`);
