// Regression checks for the Messages keyboard pinning (HANDOVER Part 64,
// Jack's review IOS-1/IOS-2). Drives the real attachKeyboardViewport with a
// fake window, visual viewport and frame, so no browser is needed:
//   node scripts/chat-keyboard.test.ts
import {
  attachKeyboardViewport,
  isKeyboardOpen,
  KEYBOARD_MIN_PX,
} from "../src/components/chat/keyboardViewport.ts";

let fail = 0;
let count = 0;
function check(name: string, actual: unknown, expected: unknown) {
  count++;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail++;
    console.error(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
  }
}

type Listener = () => void;
class Events {
  map = new Map<string, Set<Listener>>();
  addEventListener(t: string, f: Listener) {
    if (!this.map.has(t)) this.map.set(t, new Set());
    this.map.get(t)!.add(f);
  }
  removeEventListener(t: string, f: Listener) {
    this.map.get(t)?.delete(f);
  }
  emit(t: string) {
    for (const f of [...(this.map.get(t) ?? [])]) f();
  }
  size() {
    let n = 0;
    for (const s of this.map.values()) n += s.size;
    return n;
  }
}

function setup(opts: { width?: number; focused?: boolean; height?: number } = {}) {
  const props = new Map<string, string>();
  const textbox = { matches: (s: string) => s.includes("textarea") };
  const outside = { matches: (s: string) => s.includes("textarea") };
  const frame = Object.assign(new Events(), {
    dataset: {} as Record<string, string>,
    style: {
      setProperty: (k: string, v: string) => void props.set(k, v),
      removeProperty: (k: string) => void props.delete(k),
    },
    contains: (n: unknown) => n === textbox,
  });
  const vv = Object.assign(new Events(), { height: opts.height ?? 800, offsetTop: 0, scale: 1 });
  const mq = Object.assign(new Events(), { matches: (opts.width ?? 390) <= 1023 });
  const doc = { activeElement: (opts.focused ? textbox : null) as unknown };
  const win = {
    innerHeight: 800,
    visualViewport: vv,
    document: doc,
    matchMedia: () => mq,
    // run frames synchronously so each event is applied at once
    requestAnimationFrame: (f: () => void) => (f(), 1),
    cancelAnimationFrame: () => {},
  };
  const stop = attachKeyboardViewport(frame as unknown as HTMLElement, win as unknown as Window);
  const state = () => ({ kb: frame.dataset.kb ?? null, top: props.get("--vv-top") ?? null, h: props.get("--vv-h") ?? null });
  const keyboard = (h: number, top = 0) => {
    vv.height = h;
    vv.offsetTop = top;
    vv.emit("resize");
  };
  const zoom = (scale: number, h: number) => {
    vv.scale = scale;
    vv.height = h;
    vv.emit("resize");
  };
  const focus = (on: boolean, where: "frame" | "outside" = "frame") => {
    doc.activeElement = on ? (where === "frame" ? textbox : outside) : null;
    frame.emit(on ? "focusin" : "focusout");
  };
  const listeners = () => frame.size() + vv.size() + mq.size();
  return { frame, vv, mq, state, keyboard, zoom, focus, stop, listeners };
}

const PINNED_480 = { kb: "true", top: "0px", h: "480px" };
const CLEAR = { kb: null, top: null, h: null };

// --- the decision itself ---
const base = { narrow: true, typing: true, innerHeight: 800, viewportHeight: 480, scale: 1 };
check("predicate: keyboard at scale 1", isKeyboardOpen(base), true);
check("predicate: zoomed, no keyboard (Jack's probe)", isKeyboardOpen({ ...base, viewportHeight: 400, scale: 2 }), false);
check("predicate: scale noise within tolerance", isKeyboardOpen({ ...base, scale: 1.004 }), true);
check("predicate: small toolbar change is not a keyboard", isKeyboardOpen({ ...base, viewportHeight: 800 - KEYBOARD_MIN_PX }), false);
check("predicate: not typing", isKeyboardOpen({ ...base, typing: false }), false);
check("predicate: wide screen", isKeyboardOpen({ ...base, narrow: false }), false);

// --- scale 1: keyboard opens and closes ---
{
  const t = setup();
  check("idle: nothing pinned", t.state(), CLEAR);
  t.focus(true);
  t.keyboard(480);
  check("keyboard open at scale 1 pins the frame", t.state(), PINNED_480);
  t.keyboard(470, 30);
  check("iOS scrolls the viewport: top and height follow", t.state(), { kb: "true", top: "30px", h: "470px" });
  t.keyboard(800);
  check("keyboard closed unpins and clears variables", t.state(), CLEAR);
  t.stop();
}

// --- zoom without a keyboard (IOS-1) ---
{
  const t = setup({ focused: true });
  t.zoom(2, 400);
  check("pinch zoom with a focused box is not a keyboard", t.state(), CLEAR);
  t.stop();
}

// --- zoom while already pinned, then back to scale 1 ---
{
  const t = setup();
  t.focus(true);
  t.keyboard(480);
  check("pinned before zoom", t.state(), PINNED_480);
  t.zoom(1.8, 260);
  check("zoom while pinned restores normal layout", t.state(), CLEAR);
  t.zoom(1, 480);
  check("back to scale 1 with keyboard still up pins again", t.state(), PINNED_480);
  t.stop();
}

// --- focus leaving the frame ---
{
  const t = setup();
  t.focus(true);
  t.keyboard(480);
  t.focus(true, "outside");
  check("focus moves to a box outside the frame: unpinned", t.state(), CLEAR);
  t.focus(true);
  t.focus(false);
  check("focus lost: unpinned", t.state(), CLEAR);
  t.stop();
}

// --- applied on mount, breakpoint change ---
{
  // keyboard already up when the hook attaches: no event needed
  const t = setup({ focused: true, height: 480 });
  check("state applied on mount", t.state(), PINNED_480);
  t.mq.matches = false;
  t.mq.emit("change");
  check("breakpoint grows past 1023px: unpinned", t.state(), CLEAR);
  t.mq.matches = true;
  t.mq.emit("change");
  check("breakpoint back to phone: pinned again", t.state(), PINNED_480);
  t.stop();
}
{
  const t = setup({ width: 1280, focused: true, height: 480 });
  check("desktop width never pins", t.state(), CLEAR);
  t.stop();
}

// --- cleanup (IOS-2) ---
{
  const t = setup();
  t.focus(true);
  t.keyboard(480);
  check("pinned before cleanup", t.state(), PINNED_480);
  t.stop();
  check("cleanup removes data-kb and both variables", t.state(), CLEAR);
  check("cleanup removes every listener", t.listeners(), 0);
  t.keyboard(470);
  check("events after cleanup change nothing", t.state(), CLEAR);
}

console.log(`${count - fail}/${count} chat keyboard checks passed`);
if (fail) process.exit(1);
