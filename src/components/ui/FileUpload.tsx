"use client";

import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Image as ImageIcon, Upload, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

/** Matches a file against an `accept`-style pattern list ("video/mp4,
 * image/*, .pdf") — the same syntax the native `accept` attribute takes,
 * used here to give a friendly client-side message instead of just letting
 * the OS picker filter silently. */
function fileMatchesAccept(file: File, accept: string): boolean {
  const patterns = accept
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (!patterns.length) return true;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

/** Renders the icon for a selected file directly (rather than returning a
 * component reference to render later) — eslint's react-hooks/static-components
 * rule flags picking a component during render, since a fresh reference on
 * every render would reset that component's own internal state. lucide
 * icons are stateless, but returning the element itself sidesteps the rule
 * without needing a useMemo. */
function FileTypeIcon({ file, className }: { file: File | null; className?: string }) {
  if (!file) return <Upload className={className} />;
  if (file.type.startsWith("video/")) return <Video className={className} />;
  if (file.type.startsWith("image/")) return <ImageIcon className={className} />;
  return <FileText className={className} />;
}

export interface FileUploadProps {
  label: string;
  name: string;
  id?: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  /** Server-side error (e.g. from a `useActionState` result) — rendered the same way the client-side messages below are. */
  error?: string;
  /** Client-side friendly max size check, mirroring the pattern already used in AvatarUpload.tsx. The real enforcement always stays server-side. */
  maxSizeBytes?: number;
  /** Shown when a selected file exceeds `maxSizeBytes`. Required if `maxSizeBytes` is set — this component never invents its own English copy. */
  tooLargeMessage?: string;
  /** Shown when a selected file's type doesn't match `accept`. Required if `accept` should be client-validated (not just used as the picker filter). */
  invalidTypeMessage?: string;
  /** Instructional copy inside the empty dropzone, e.g. "Drag and drop a file here, or click to browse". */
  dropzoneLabel: string;
  /** Label for the remove/clear control shown once a file is selected. */
  removeLabel: string;
  className?: string;
}

/**
 * An attractive drag-and-drop file picker that still submits through a real,
 * native `<input type="file">` — same spirit as Listbox.tsx driving a real
 * hidden `<select>`, except here the native input itself stays the
 * interactive element (absolutely positioned over the dropzone, fully
 * transparent) rather than a separate hidden node, so native keyboard
 * behavior (Space to open the picker, real tab focus, native `required`
 * validation) all keep working for free. Enter is wired explicitly since
 * browsers don't treat it as an activation key for file inputs the way
 * Space is. Drag-and-drop assigns the dropped file to the same input via a
 * constructed `DataTransfer`, so a surrounding `<form action={...}>` +
 * `useActionState` sees `formData.get(name)` exactly as if the user had
 * used the native picker — no client-side-only file state.
 */
export function FileUpload({
  label,
  name,
  id,
  accept,
  required,
  disabled,
  hint,
  error,
  maxSizeBytes,
  tooLargeMessage,
  invalidTypeMessage,
  dropzoneLabel,
  removeLabel,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id ?? name ?? generatedId;
  const hintId = `${inputId}-hint`;

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [clientError, setClientError] = useState<string>();

  const displayError = clientError ?? error;

  function validate(candidate: File): string | undefined {
    if (accept && invalidTypeMessage && !fileMatchesAccept(candidate, accept)) return invalidTypeMessage;
    if (maxSizeBytes && candidate.size > maxSizeBytes) return tooLargeMessage;
    return undefined;
  }

  function clearInput() {
    if (inputRef.current) inputRef.current.value = "";
    setFile(null);
  }

  function acceptFile(candidate: File) {
    const message = validate(candidate);
    if (message) {
      setClientError(message);
      clearInput();
      return;
    }
    setClientError(undefined);
    setFile(candidate);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const candidate = e.target.files?.[0];
    if (!candidate) return;
    acceptFile(candidate);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const candidate = e.dataTransfer.files?.[0];
    if (!candidate) return;

    const message = validate(candidate);
    if (message) {
      setClientError(message);
      clearInput();
      return;
    }
    setClientError(undefined);
    const transfer = new DataTransfer();
    transfer.items.add(candidate);
    if (inputRef.current) inputRef.current.files = transfer.files;
    setFile(candidate);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Space already opens the native picker on a focused file input; Enter
    // doesn't in most browsers, so it's wired explicitly here.
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  function onRemove(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setClientError(undefined);
    clearInput();
  }

  return (
    <div className={className}>
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-all duration-150",
          dragOver
            ? "border-gold-400 bg-gold-50/60 dark:border-gold-400 dark:bg-gold-500/10"
            : "border-slate-200 bg-slate-50 hover:border-navy-300 dark:border-navy-700 dark:bg-navy-800/60 dark:hover:border-navy-500",
          displayError && "border-red-300 dark:border-red-800/70",
          "focus-within:border-navy-400 focus-within:ring-2 focus-within:ring-navy-100 dark:focus-within:border-gold-400 dark:focus-within:ring-navy-800",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          required={required}
          disabled={disabled}
          onChange={onInputChange}
          onKeyDown={onInputKeyDown}
          aria-describedby={hint || displayError ? hintId : undefined}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <AnimatePresence mode="wait" initial={false}>
          {file ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="pointer-events-none flex w-full items-center justify-center gap-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-700 dark:bg-navy-700/60 dark:text-navy-100">
                <FileTypeIcon file={file} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-left rtl:text-right">
                <span className="block truncate text-sm font-medium text-navy-900 dark:text-white">{file.name}</span>
                <span className="block text-xs text-slate-500 dark:text-navy-400">{formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                onClick={onRemove}
                aria-label={removeLabel}
                className="pointer-events-auto relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 dark:text-navy-400 dark:hover:bg-navy-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="pointer-events-none flex flex-col items-center gap-2"
            >
              <motion.span
                animate={{ scale: dragOver ? 1.1 : 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  dragOver
                    ? "bg-gold-100 text-gold-700 dark:bg-gold-500/20 dark:text-gold-300"
                    : "bg-slate-200/70 text-slate-500 dark:bg-navy-700/60 dark:text-navy-300"
                )}
              >
                <Upload className="h-5 w-5" />
              </motion.span>
              <span className="text-sm text-slate-600 dark:text-navy-300">{dropzoneLabel}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {hint && !displayError && (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-navy-400">
          {hint}
        </p>
      )}
      {displayError && (
        <p id={hintId} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {displayError}
        </p>
      )}
    </div>
  );
}
