"use client";

import { useEffect, type RefObject } from "react";
import { attachKeyboardViewport } from "@/components/chat/keyboardViewport";

/** Pins the Messages frame above the phone keyboard; see keyboardViewport.ts. */
export function useKeyboardViewport(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return attachKeyboardViewport(el, window);
  }, [ref]);
}
