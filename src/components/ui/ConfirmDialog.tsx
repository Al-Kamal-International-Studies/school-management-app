"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * A reusable confirmation modal — same AnimatePresence + backdrop pattern
 * already used for the mobile sidebar drawer (Sidebar.tsx), just centered
 * instead of edge-anchored. Used for anything destructive/hard-to-reverse
 * (e.g. permanently archiving an account).
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

  return (
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
    </AnimatePresence>
  );
}
