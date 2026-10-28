import { MessageCircle } from "lucide-react";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";

/** Right pane with no chat open (desktop only; phones show the list instead). */
export default async function MessagesPage() {
  const dict = await getDictionary(await getLocale());
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <MessageCircle className="h-10 w-10 text-slate-300 dark:text-navy-600" strokeWidth={1.5} />
      <p className="max-w-xs text-sm text-slate-500 dark:text-navy-400">{dict.messages.selectChat}</p>
    </div>
  );
}
