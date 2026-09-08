"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * A reusable confirmation modal — same AnimatePresence + backdrop pattern
 * already used for the mobile sidebar drawer (Sidebar.tsx), just centered
 * instead of edge-anchored. Used for anything destructive/hard-to-reverse
 * (e.g. permanently archiving an account).
 *
 * Rendered through a portal to `document.body` — a real bug found live
 * (Muhammad, chat, 2026-09-08: "a message shows up, but it seems to be
 * hidden" on /admin/admissions' delete flow). Root cause: `FadeUp`'s
 * `animate-fade-in-up` CSS keyframe (tailwind.config.ts) ends on
 * `transform: translateY(0)` with `animation-fill-mode: both` — that
 * computes to `matrix(1,0,0,1,0,0)`, not `none`, and `both` keeps it
 * applied forever after the animation finishes, not just during it. Per
 * the CSS spec, ANY element with a non-`none` transform becomes the
 * containing block for its `position: fixed` descendants. A caller like
 * DeleteAdmissionButton.tsx is nested inside a `FadeUp`-wrapped card —
 * without a portal, this dialog's `fixed inset-0` backdrop resolved
 * relative to that small card instead of the viewport, collapsing the
 * "fullscreen" overlay down into a tiny, mostly-off-screen box (confirmed
 * live via getBoundingClientRect() — the wrapper measured the card's own
 * ~667×90px box, not the viewport). A portal escapes the transformed
 * ancestor entirely, so `position: fixed` measures against the real
 * viewport as intended — this wasn't specific to one FadeUp card, every
 * ConfirmDialog caller anywhere in the app was equally exposed (see
 * AvatarCropperModal.tsx for the other instance of the same underlying
 * bug, fixed the same way).
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  pending?: boolean;
}) {
  const { dict } = useLocale();

  // `document` doesn't exist during SSR — safe to gate on directly rather
  // than a mounted-after-effect pattern (which this codebase deliberately
  // avoids elsewhere, see FadeUp.tsx's own doc comment, since an effect
  // that never fires can leave content permanently stuck) because `open`
  // itself can never be `true` on a server render; it's plain useState(false)
  // in every caller, only ever flipped true by a real client click after
  // hydration has already completed. This check is re-evaluated fresh on
  // every render, so there's no window where it could resolve incorrectly.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative flex h-full items-center justify-center p-4" onClick={onClose}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              className="w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-navy-800 dark:bg-navy-900"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="confirm-dialog-title" className="font-display text-lg font-semibold text-navy-900 dark:text-white">
                {title}
              </h2>
              <div className="mt-3 text-sm text-slate-600 dark:text-navy-200">{children}</div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="btn-secondary">
                  {dict.common.cancel}
                </button>
                <button type="button" disabled={confirmDisabled || pending} onClick={onConfirm} className="btn-danger">
                  {pending ? dict.common.loading : confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
