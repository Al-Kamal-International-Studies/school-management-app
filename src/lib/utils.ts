import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

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
