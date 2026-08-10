"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListboxOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

function optionsFromChildren(children: ReactNode): ListboxOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== "option") return [];
    const props = child.props as { value?: string; children?: ReactNode; disabled?: boolean };
    return [{ value: String(props.value ?? ""), label: props.children, disabled: props.disabled }];
  });
}

interface ListboxProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children" | "onChange"> {
  children: ReactNode;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * A visually-animated dropdown that behaves exactly like a native <select>
 * from the outside — same `name`/`value`/`defaultValue`/`onChange`/
 * `required`/`disabled` props, and it participates in FormData submission
 * normally. A real <select> stays in the DOM (visually hidden, not
 * `display:none`, so assistive tech and the custom `role="listbox"` panel
 * built here stay in sync) — it's what any surrounding <form> actually
 * reads. The visible button + animated panel are a second layer that drives
 * the hidden select via a real dispatched `change` event (through the
 * native property setter, the same technique already used elsewhere in
 * this project for driving React-controlled fields from outside React —
 * see HANDOVER.md's automated-testing notes), so any consumer's `onChange`
 * fires exactly as if the user had used the native control. That means
 * every existing caller of Field.tsx's `Select` gets the fade-down
 * animation with zero changes to how it's used.
 */
export function Listbox({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  className,
  children,
  ...rest
}: ListboxProps) {
  const options = useMemo(() => optionsFromChildren(children), [children]);
  const selectRef = useRef<HTMLSelectElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id ?? name ?? generatedId;

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? value ?? ""));
  const currentValue = isControlled ? String(value) : internalValue;

  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  // `currentValue` already reads `value` directly when controlled (see
  // above), so there's no separate state to sync from an effect — no
  // "adjust state during render"/effect needed for that part at all.

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /** Opens the panel and resets the keyboard-highlighted option to match the
   * current value — done directly in the event handler that opens the
   * panel (click/keydown) rather than an effect reacting to `open`, so
   * there's no synchronous setState-in-effect to work around. */
  function openDropdown() {
    const currentIndex = options.findIndex((o) => o.value === currentValue);
    setHighlighted(currentIndex >= 0 ? currentIndex : 0);
    setOpen(true);
  }

  function commitValue(next: string) {
    setInternalValue(next);
    setOpen(false);
    const el = selectRef.current;
    if (!el) return;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
    nativeSetter?.call(el, next);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openDropdown();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[highlighted];
      if (opt && !opt.disabled) commitValue(opt.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const selected = options.find((o) => o.value === currentValue);

  return (
    <div ref={containerRef} className="relative">
      <select
        ref={selectRef}
        id={selectId}
        name={name}
        required={required}
        disabled={disabled}
        value={isControlled ? currentValue : undefined}
        defaultValue={isControlled ? undefined : defaultValue}
        onChange={(e) => {
          setInternalValue(e.target.value);
          onChange?.(e);
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        {...rest}
      >
        {children}
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "input flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>{selected ? selected.label : " "}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-20 mt-1.5 max-h-60 w-full origin-top overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-card-hover dark:border-navy-700 dark:bg-navy-900"
          >
            {options.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === currentValue}
                disabled={opt.disabled}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => commitValue(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  i === highlighted && "bg-slate-50 dark:bg-navy-800/60",
                  opt.value === currentValue
                    ? "text-navy-900 dark:text-white"
                    : "text-slate-700 dark:text-navy-200",
                  opt.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === currentValue && <Check className="h-3.5 w-3.5 shrink-0 text-gold-600 dark:text-gold-400" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
