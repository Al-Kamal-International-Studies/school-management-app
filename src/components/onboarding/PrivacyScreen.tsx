"use client";

import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { FrameworkStrings } from "@/lib/onboarding/i18n/framework";
import type { UserRole } from "@/lib/types/database.types";
import { ScreenTitle } from "./parts";

/** Chapter 4: an honest, per-role summary of who sees what. */
export function PrivacyScreen({ role, t }: { role: UserRole; t: FrameworkStrings }) {
  const p = t.privacy;
  return (
    <div className="space-y-6">
      <ScreenTitle title={p.title} description={p.intro} />

      <Card className="max-w-3xl divide-y divide-slate-100 p-0 dark:divide-navy-800">
        {p.items[role].map((item) => (
          <section key={item.title} className="space-y-1 px-5 py-4">
            <h2 className="card-title">{item.title}</h2>
            <p className="text-sm text-slate-700 dark:text-navy-100">{item.body}</p>
          </section>
        ))}
      </Card>

      <Card className="flex max-w-3xl items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-navy-300" strokeWidth={1.75} aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="card-title">{p.safetyTitle}</h2>
          <p className="text-sm text-slate-700 dark:text-navy-100">{p.safetyBody}</p>
        </div>
      </Card>
    </div>
  );
}
