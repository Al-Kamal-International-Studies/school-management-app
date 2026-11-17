"use client";

import { useEffect, type RefObject } from "react";

/**
 * Phones: while the on-screen keyboard is up, pin the Messages frame to the
 * visible part of the screen (the visual viewport) so the composer sits
 * directly on top of the keyboard, the way WhatsApp does.
 *
 * iOS does not shrink the page when the keyboard opens; it slides the page
 * up instead, which left the composer floating with a band of empty page
 * between it and the keyboard. Here the frame gets `data-kb="true"` plus
 * the visual viewport's top and height as CSS variables, and chat.css turns
 * that into a fixed box of exactly that size. Desktop never matches.
 */
export function useKeyboardViewport(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    const vv = window.visualViewport;
    if (!el || !vv) return;
    const narrow = window.matchMedia("(max-width: 1023px)");
    let raf = 0;

    const apply = () => {
      const active = document.activeElement;
      const typing = !!active && el.contains(active) && active.matches("textarea, input");
      const open = narrow.matches && typing && window.innerHeight - vv.height > 100;
      if (open) {
        el.dataset.kb = "true";
        el.style.setProperty("--vv-top", `${vv.offsetTop}px`);
        el.style.setProperty("--vv-h", `${vv.height}px`);
      } else if (el.dataset.kb) {
        delete el.dataset.kb;
        el.style.removeProperty("--vv-top");
        el.style.removeProperty("--vv-h");
      }
    };
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    el.addEventListener("focusin", update);
    el.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      el.removeEventListener("focusin", update);
      el.removeEventListener("focusout", update);
      delete el.dataset.kb;
    };
  }, [ref]);
}
