/**
 * Phones: while the on-screen keyboard is up, pin the Messages frame to the
 * visible part of the screen (the visual viewport) so the composer sits
 * directly on top of the keyboard, the way WhatsApp does.
 *
 * iOS does not shrink the page when the keyboard opens; it slides the page
 * up, which left the composer floating with a band of empty page between it
 * and the keyboard. While pinned, the frame carries `data-kb="true"` plus the
 * visual viewport's top and height as `--vv-top` / `--vv-h`; chat.css turns
 * that into a fixed box of exactly that size.
 *
 * Pinch zoom also shrinks the visual viewport, so a zoomed viewport is never
 * treated as a keyboard (Jack's review IOS-1): while `scale` is not 1 the
 * frame stays in (or goes back to) its normal layout and native zoom and
 * panning are left alone. Unsupported on purpose: zooming in while the
 * keyboard is up unpins the frame until the zoom returns to 1.
 *
 * Plain module, no React, so scripts/chat-keyboard.test.ts drives the exact
 * code the app runs.
 */

/** The visual viewport must be at least this much shorter than the window. */
export const KEYBOARD_MIN_PX = 100;
/** Scale this close to 1 counts as "not zoomed" (float noise on some devices). */
export const ZOOM_TOLERANCE = 0.01;
/** Matches the dashboard breakpoint below which Messages is single-pane. */
export const NARROW_QUERY = "(max-width: 1023px)";

export type KeyboardInputs = {
  narrow: boolean;
  typing: boolean;
  innerHeight: number;
  viewportHeight: number;
  scale: number;
};

export function isKeyboardOpen(s: KeyboardInputs): boolean {
  return (
    s.narrow &&
    s.typing &&
    Math.abs(s.scale - 1) <= ZOOM_TOLERANCE &&
    s.innerHeight - s.viewportHeight > KEYBOARD_MIN_PX
  );
}

/** Removes everything this module ever writes on the frame. */
export function resetKeyboardState(el: HTMLElement) {
  delete el.dataset.kb;
  el.style.removeProperty("--vv-top");
  el.style.removeProperty("--vv-h");
}

/**
 * Starts watching; returns the cleanup. State is applied once at once (the
 * keyboard may already be up), then on viewport resize/scroll, focus moving
 * in or out of the frame, and the breakpoint changing.
 */
export function attachKeyboardViewport(el: HTMLElement, win: Window): () => void {
  const vv = win.visualViewport;
  if (!vv) return () => resetKeyboardState(el);
  const narrow = win.matchMedia(NARROW_QUERY);
  let raf = 0;

  const apply = () => {
    const active = win.document.activeElement;
    const typing = !!active && el.contains(active) && active.matches("textarea, input");
    const open = isKeyboardOpen({
      narrow: narrow.matches,
      typing,
      innerHeight: win.innerHeight,
      viewportHeight: vv.height,
      scale: vv.scale,
    });
    if (open) {
      el.dataset.kb = "true";
      el.style.setProperty("--vv-top", `${vv.offsetTop}px`);
      el.style.setProperty("--vv-h", `${vv.height}px`);
    } else {
      resetKeyboardState(el);
    }
  };
  const update = () => {
    win.cancelAnimationFrame(raf);
    raf = win.requestAnimationFrame(apply);
  };

  vv.addEventListener("resize", update);
  vv.addEventListener("scroll", update);
  el.addEventListener("focusin", update);
  el.addEventListener("focusout", update);
  narrow.addEventListener("change", update);
  apply();

  return () => {
    win.cancelAnimationFrame(raf);
    vv.removeEventListener("resize", update);
    vv.removeEventListener("scroll", update);
    el.removeEventListener("focusin", update);
    el.removeEventListener("focusout", update);
    narrow.removeEventListener("change", update);
    resetKeyboardState(el);
  };
}
