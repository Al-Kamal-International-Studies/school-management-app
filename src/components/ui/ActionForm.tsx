"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useTransition,
  type FormEvent,
  type FormHTMLAttributes,
  type Ref,
} from "react";
import { useFormStatus as useReactFormStatus } from "react-dom";

/**
 * A drop-in replacement for `<form action={formAction}>` (the `formAction`
 * returned by `useActionState`) that does NOT let React wipe the form.
 *
 * Why it exists: React 19 automatically calls `form.reset()` after EVERY
 * function passed to `<form action>` finishes — whether the server returned a
 * validation error or succeeded. Every form in this app used that pattern, so
 * a server-side error ("password too short", "duplicate email") blanked all
 * the user's typed input, and an edit form such as the teacher's attendance
 * sheet snapped back to its mount-time `defaultValue`s after a successful save
 * (so re-saving silently overwrote the marks just saved). Found by the
 * 2026-10-02 audit (HANDOVER Part 33) — confirmed in react-dom's
 * `startHostTransition()`.
 *
 * Submitting through `onSubmit` + `startTransition` runs the same Server
 * Action with the same FormData but bypasses that automatic reset, so:
 *   - on error the user's input stays exactly as typed;
 *   - on success an edit form keeps the (now saved) values;
 *   - a create-style form can opt in to clearing itself with
 *     `resetOnSuccess` (it clears only when the action returned no `error`).
 *
 * Pending state: a plain `useFormStatus()` only tracks `<form action>`, so
 * this component also publishes its own transition's pending flag, and this
 * module exports a `useFormStatus` wrapper that ORs the two — existing
 * SubmitButton components just change their import.
 */

const PendingContext = createContext(false);

/** Same shape as react-dom's useFormStatus(), but also true while an ActionForm is submitting. */
export function useFormStatus() {
  const real = useReactFormStatus();
  const submitting = useContext(PendingContext);
  return { ...real, pending: real.pending || submitting };
}

type ActionFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  /** The `formAction` from `useActionState`. */
  action: (formData: FormData) => void;
  /** The `state` from the same `useActionState` — used only to tell success from error. */
  state?: { error?: string } | null;
  /** Clear the form after a successful submit (create-style forms). Default: keep the values. */
  resetOnSuccess?: boolean;
  ref?: Ref<HTMLFormElement>;
};

export function ActionForm({ action, state, resetOnSuccess = false, ref, children, ...rest }: ActionFormProps) {
  const [isPending, startTransition] = useTransition();
  const innerRef = useRef<HTMLFormElement | null>(null);
  const wasPending = useRef(false);

  const setRefs = useCallback(
    (node: HTMLFormElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLFormElement | null }).current = node;
    },
    [ref]
  );

  useEffect(() => {
    if (wasPending.current && !isPending && resetOnSuccess && !state?.error) innerRef.current?.reset();
    wasPending.current = isPending;
  }, [isPending, resetOnSuccess, state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | HTMLInputElement | null;
    // Passing the submitter keeps a clicked button's own name/value in the data,
    // exactly like a native submit / <form action> would.
    const formData = new FormData(event.currentTarget, submitter ?? undefined);
    startTransition(() => action(formData));
  }

  return (
    <PendingContext.Provider value={isPending}>
      <form {...rest} ref={setRefs} onSubmit={handleSubmit}>
        {children}
      </form>
    </PendingContext.Provider>
  );
}
