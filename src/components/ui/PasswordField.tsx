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
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors rtl:right-auto rtl:left-3"
        >
          {visible ? (
            <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <EyeOff className="h-4 w-4 text-red-500 dark:text-red-400" />
          )}
        </button>
      </div>
    </FieldWrapper>
  );
}
