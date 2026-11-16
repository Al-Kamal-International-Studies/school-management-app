"use client";

import { ChevronRight } from "lucide-react";
import { GLANCE_GROUPS, type GroupId } from "@/lib/onboarding/config";
import type { FrameworkStrings } from "@/lib/onboarding/i18n/framework";
import { lessonTexts } from "@/lib/onboarding/registry";
import type { LessonDef, OnboardingLocale } from "@/lib/onboarding/types";
import type { UserRole } from "@/lib/types/database.types";
import type { Dictionary } from "@/lib/i18n/types";
import type { NavItem } from "@/components/nav/Sidebar";
import { ListCard, ListRows } from "@/components/ui/List";
import { ScreenTitle } from "./parts";

/**
 * Chapter 2: the person's own sidebar, grouped, one plain sentence per item.
 * Choosing an item jumps to its lesson.
 */
export function GlanceScreen({
  role,
  items,
  lessons,
  locale,
  dict,
  t,
  onOpenLesson,
}: {
  role: UserRole;
  /** Sidebar items for this person, in order (including Settings). */
  items: NavItem[];
  lessons: LessonDef[];
  locale: OnboardingLocale;
  dict: Dictionary;
  t: FrameworkStrings;
  onOpenLesson: (lessonId: string) => void;
}) {
  const byHref = new Map(lessons.map((l) => [l.navHref, l]));
  const placed = new Set<string>();
  const groups: { id: GroupId; items: NavItem[] }[] = [];

  for (const g of GLANCE_GROUPS[role]) {
    const inGroup = g.hrefs
      .map((h) => items.find((i) => i.href === h))
      .filter((i): i is NavItem => !!i && byHref.has(i.href));
    inGroup.forEach((i) => placed.add(i.href));
    if (inGroup.length) groups.push({ id: g.id, items: inGroup });
  }
  const rest = items.filter((i) => !placed.has(i.href) && byHref.has(i.href));
  if (rest.length) groups.push({ id: "more", items: rest });

  return (
    <div className="space-y-7">
      <ScreenTitle title={t.glance.title} description={t.glance.intro} />
      {groups.map((g) => {
        const headingId = `onb-glance-${g.id}`;
        return (
          <section key={g.id} aria-labelledby={headingId} className="space-y-3">
            <h2 id={headingId} className="section-title">
              {t.glance.groups[g.id]}
            </h2>
            <ListCard>
              <ListRows>
                {g.items.map((item) => {
                  const lesson = byHref.get(item.href)!;
                  const Icon = item.icon;
                  const label = dict.nav[item.labelKey];
                  const text = lessonTexts(lesson, role)[locale];
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => onOpenLesson(lesson.id)}
                        className="flex min-h-14 w-full items-center gap-4 px-5 py-3 text-start transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-500 dark:hover:bg-white/[0.03] dark:focus-visible:bg-white/[0.03]"
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0 text-slate-500 dark:text-navy-300" strokeWidth={1.75} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-900 dark:text-white">{label}</span>
                          <span className="mt-0.5 block text-sm text-slate-500 dark:text-navy-300">{text.oneLiner}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 rtl:rotate-180 dark:text-navy-600" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ListRows>
            </ListCard>
          </section>
        );
      })}
    </div>
  );
}
