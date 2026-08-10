"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeDeviceAction } from "@/app/devices/manage/actions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function RemoveDeviceButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { dict } = useLocale();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeDeviceAction(id);
          router.refresh();
        })
      }
      className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? dict.devices.removing : dict.devices.remove}
    </button>
  );
}
