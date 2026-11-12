import { getDictionary } from "@/lib/i18n/getDictionary";
import { getLocale } from "@/lib/i18n/getLocale";
import { Icon } from "@/components/chat/icons";

/** Right pane with no chat open (spec §6; on narrow frames the list shows instead). */
export default async function MessagesPage() {
  const dict = await getDictionary(await getLocale());
  return (
    <section className="ch-empty ch-wallpaper">
      <span className="ch-empty-icon">
        <Icon name="chat" size={28} />
      </span>
      <p>{dict.messages.selectChat}</p>
    </section>
  );
}
