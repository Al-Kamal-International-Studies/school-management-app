"use client";

import { useEffect, useState } from "react";

/** Open/closed state for a popover that closes on an outside press and on Esc. `ref` is a callback ref for the wrapper. */
export function usePopover<T extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const [node, ref] = useState<T | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPress = (e: MouseEvent | TouchEvent) => {
      if (node && !node.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPress);
    document.addEventListener("touchstart", onPress);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPress);
      document.removeEventListener("touchstart", onPress);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, node]);

  return [open, setOpen, ref] as const;
}
