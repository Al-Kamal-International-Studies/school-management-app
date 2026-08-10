"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function ClassSelect({
  classes,
  selectedClassId,
}: {
  classes: { id: string; name: string; section: string }[];
  selectedClassId?: string;
}) {
  const { dict } = useLocale();
  return (
    <form method="get" className="max-w-xs">
      <label className="label" htmlFor="class">
        {dict.adminClasses.class}
      </label>
      <select
        id="class"
        name="class"
        defaultValue={selectedClassId}
        className="input bg-white"
        onChange={(e) => e.currentTarget.form?.submit()}
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} - {c.section}
          </option>
        ))}
      </select>
    </form>
  );
}
