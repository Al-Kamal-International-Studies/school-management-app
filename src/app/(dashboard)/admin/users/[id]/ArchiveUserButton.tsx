"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { archiveUserAction } from "../actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function ArchiveUserButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { dict } = useLocale();

  function close() {
    setOpen(false);
    setConfirmText("");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-red-600 hover:text-red-700">
        {dict.deletion.permanentlyDelete}
      </button>
      <ConfirmDialog
        open={open}
        onClose={close}
        title={dict.deletion.confirmTitle}
        confirmLabel={dict.deletion.confirmButton}
        confirmDisabled={confirmText !== "DELETE"}
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            await archiveUserAction(userId);
            close();
            router.push("/admin/users");
          })
        }
      >
        <p>{dict.deletion.confirmBody}</p>
        <label htmlFor="confirm-delete-input" className="mt-4 block text-xs font-medium text-slate-500 dark:text-navy-400">
          {dict.deletion.confirmTypeInstruction}
        </label>
        <input
          id="confirm-delete-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="input mt-1.5"
          autoComplete="off"
        />
      </ConfirmDialog>
    </>
  );
}
