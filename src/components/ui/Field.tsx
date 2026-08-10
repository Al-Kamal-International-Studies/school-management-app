import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Listbox } from "@/components/ui/Listbox";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, htmlFor, error, hint, children }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-navy-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function Input({ label, name, error, hint, className, ...props }: InputProps) {
  return (
    <FieldWrapper label={label} htmlFor={name} error={error} hint={hint}>
      <input id={name} name={name} className={cn("input", className)} {...props} />
    </FieldWrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, name, error, hint, className, rows = 4, ...props }: TextareaProps) {
  return (
    <FieldWrapper label={label} htmlFor={name} error={error} hint={hint}>
      <textarea id={name} name={name} rows={rows} className={cn("input resize-y", className)} {...props} />
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function Select({ label, name, error, hint, className, children, ...props }: SelectProps) {
  return (
    <FieldWrapper label={label} htmlFor={name} error={error} hint={hint}>
      <Listbox id={name} name={name} className={className} {...props}>
        {children}
      </Listbox>
    </FieldWrapper>
  );
}
