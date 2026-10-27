"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldWrapper } from "@/components/ui/Field";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  /** Optional decorative icon on the leading edge (e.g. Lock on the login page). */
  icon?: LucideIcon;
  /** Labels for the toggle button's accessible name — pass translated strings where available. */
  showLabel?: string;
  hideLabel?: string;
}

/**
 * A password `<input>` with a show/hide toggle on the trailing edge. Closed-eye
 * (red) while hidden, open-eye (green) once revealed — the color itself signals
 * state, not just the icon shape. `type="button"` on the toggle so it never
 * submits the surrounding form; `tabIndex` left at default so it stays keyboard
 * reachable. Reuses Field.tsx's `FieldWrapper` for label/error/hint so it looks
 * identical to every other field in the app.
 */
export function PasswordField({
  label,
  name,
  error,
  hint,
  icon: Icon,
  showLabel = "Show password",
  hideLabel = "Hide password",
  className,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldWrapper label={label} htmlFor={name} error={error} hint={hint}>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3.5" />
        )}
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          className={cn(
            "input pr-10 rtl:pr-3.5",
            Icon ? "pl-10 rtl:pl-10 rtl:pr-10" : "rtl:pl-10",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 dark:text-navy-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-navy-300 rtl:right-auto rtl:left-2"
        >
          {/* Neutral ink (redesign): red/green are reserved for real
              error/success states app-wide (DESIGN.md), so the eye no
              longer borrows them to signal hidden/shown. */}
          {visible ? <Eye className="h-4 w-4" strokeWidth={1.75} /> : <EyeOff className="h-4 w-4" strokeWidth={1.75} />}
        </button>
      </div>
    </FieldWrapper>
  );
}
