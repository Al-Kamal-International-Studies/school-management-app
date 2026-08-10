import { clsx, type ClassValue } from "clsx";
import type { Dictionary } from "@/lib/i18n/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** English fallback — prefer `getDayNames(dict)` wherever a dictionary is
 * available so the day names actually localize; kept for the couple of
 * call sites (Zod schemas, etc.) that only need day *indices*, not display
 * text. */
export const DAY_NAMES = [
  "", // 0 unused, day_of_week is 1-7
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Same 1-indexed shape as DAY_NAMES (index 0 unused, day_of_week is 1-7),
 * but pulled from the active locale's dictionary. */
export function getDayNames(dict: Dictionary): string[] {
  return ["", dict.days.monday, dict.days.tuesday, dict.days.wednesday, dict.days.thursday, dict.days.friday, dict.days.saturday, dict.days.sunday];
}

/** "09:00:00" -> "9:00 AM" */
export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, "0")} ${period}`;
}

/** JS Date.getDay() is 0=Sunday..6=Saturday; our schema uses 1=Monday..7=Sunday */
export function jsDayToDbDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
