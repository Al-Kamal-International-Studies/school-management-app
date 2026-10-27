import { z } from "zod";

/**
 * A required number from a form field. `z.coerce.number()` on its own turns an
 * EMPTY field ("") into 0, so a teacher who left a grade / marks / metric blank
 * silently recorded a real 0 (and an ungraded assignment became "graded 0") —
 * audit findings CR-08 / TF-12 (HANDOVER Part 33). Blank (or non-numeric) input
 * now fails validation with `message` instead.
 */
export function numberInRange(message: string, { min, max, gt }: { min?: number; max?: number; gt?: number } = {}) {
  // Zod 4: `{ error }` replaces v3's required_error/invalid_type_error, and
  // numbers are finite by default (v3's .finite() is no longer needed).
  let n = z.coerce.number({ error: message });
  if (min !== undefined) n = n.min(min, message);
  if (max !== undefined) n = n.max(max, message);
  if (gt !== undefined) n = n.gt(gt, message);
  return z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), n);
}

/**
 * Dates + reason for a leave request. A leave may be filed for today/the future or
 * up to two weeks back (reporting yesterday's illness is normal), but not for years
 * ago or 2099 — both used to be accepted (audit finding SP-09, HANDOVER Part 33).
 */
export function leaveRequestFields(today: string) {
  const dayMs = 86_400_000;
  const shift = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);
  const date = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required.`);
  return {
    reason: z.string().trim().min(3, "Please give a short reason.").max(1000, "Keep the reason under 1000 characters."),
    start_date: date("Start date").refine((v) => v >= shift(-14), "The start date can't be more than two weeks ago."),
    end_date: date("End date").refine((v) => v <= shift(366), "The end date is too far in the future."),
  };
}

/** A required, trimmed, non-empty string (a whitespace-only value is "empty"). */
export const requiredText = (message: string, maxLength = 500) => z.string().trim().min(1, message).max(maxLength, `Keep this under ${maxLength} characters.`);
