import { z } from "zod";

/**
 * Centralized password policy — see docs/SECURITY.md §1/§2. Deliberately
 * NOT following the old NIST-deprecated rules (no forced rotation, no
 * "must contain a symbol" composition rules) — length + a breach/common
 * check is what current NIST guidance (SP 800-63B) actually recommends.
 *
 * The blocklist below is a small, hand-maintained list of extremely common
 * passwords as a first line of defense — it is NOT a substitute for a real
 * breached-password database. Turn on Supabase's built-in "Leaked password
 * protection" (Authentication → Policies in the dashboard, HaveIBeenPwned-
 * backed, zero code) alongside this — see docs/SECURITY.md §5.
 */
export const MIN_PASSWORD_LENGTH = 12;
export const MIN_PASSWORD_LENGTH_ADMIN = 15;
export const MAX_PASSWORD_LENGTH = 128; // generous ceiling — checklist asks for "at least 64" allowed, not capped at 64.

// A short list of the most commonly reused/breached passwords and obvious
// keyboard-walk patterns. Checked case-insensitively, with digits/spaces
// stripped, so "Password123!" and "p a s s w o r d" both still match
// "password". Not exhaustive by design — see doc comment above.
const COMMON_PASSWORDS = [
  "password", "passw0rd", "letmein", "qwerty", "qwertyuiop", "asdfghjkl",
  "iloveyou", "admin", "administrator", "welcome", "monkey", "dragon",
  "football", "baseball", "master", "superman", "trustno1", "sunshine",
  "princess", "abc", "abcd", "abcdefg", "abcdefgh", "changeme", "letmein1",
  "password1", "passw0rd1", "12345678", "123456789", "1234567890",
  "qazwsx", "zxcvbnm", "michael", "jennifer", "computer", "internet",
  "starwars", "hunter2", "whatever", "freedom", "batman", "shadow",
  "alkamal", "alkamalinternational", "school", "student", "teacher",
] as const;

function normalize(input: string): string {
  return input.toLowerCase().replace(/[\s\d]+/g, "").replace(/[^a-z]/g, "");
}

export function isCommonPassword(password: string): boolean {
  const normalized = normalize(password);
  if (!normalized) return false;
  return COMMON_PASSWORDS.some((weak) => normalized === weak || normalized.includes(weak));
}

export type PasswordCheckResult = { ok: true } | { ok: false; message: string };

export function checkPasswordStrength(password: string, minLength: number = MIN_PASSWORD_LENGTH): PasswordCheckResult {
  if (password.length < minLength) {
    return { ok: false, message: `Password must be at least ${minLength} characters.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, message: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` };
  }
  if (isCommonPassword(password)) {
    return { ok: false, message: "That password is too common — choose something less guessable." };
  }
  return { ok: true };
}

/** Zod schema factory so every entry point (create user, change password, reset password) shares one source of truth. */
export function passwordZodSchema(minLength: number = MIN_PASSWORD_LENGTH) {
  return z
    .string()
    .min(minLength, `Password must be at least ${minLength} characters.`)
    .max(MAX_PASSWORD_LENGTH, `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`)
    .refine((value) => !isCommonPassword(value), "That password is too common — choose something less guessable.");
}
