"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteAdmissionAction } from "../actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Same type-DELETE-to-confirm shape as ArchiveUserButton.tsx — see
 * deleteAdmissionAction's own doc comment for exactly what gets deleted vs.
 * archived underneath. */
export function DeleteAdmissionButton({ admissionId }: { admissionId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { dict } = useLocale();

  function close() {
    setOpen(false);
    setConfirmText("");
  }

  return (
    <div>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        {dict.admissions.deleteAdmission}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}
      <ConfirmDialog
        open={open}
        onClose={close}
        title={dict.admissions.deleteConfirmTitle}
        confirmLabel={pending ? dict.admissions.deleting : dict.admissions.deleteConfirmButton}
        confirmDisabled={confirmText !== "DELETE"}
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteAdmissionAction(admissionId);
            if (result.error) {
              setError(result.error);
              close();
              return;
            }
            close();
            router.push("/admin/admissions");
          })
        }
      >
        <p>{dict.admissions.deleteConfirmBody}</p>
        <label htmlFor="confirm-delete-admission-input" className="mt-4 block text-xs font-medium text-slate-500 dark:text-navy-400">
          {dict.deletion.confirmTypeInstruction}
        </label>
        <input
          id="confirm-delete-admission-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="input mt-1.5"
          autoComplete="off"
        />
      </ConfirmDialog>
    </div>
  );
}
