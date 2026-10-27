/**
 * The 3-strikes account lockout (migration 0022): this many *consecutive*
 * wrong passwords deactivates the account and bans it at the Auth level
 * until an admin reactivates it — even the correct password is refused
 * from then on. Separate from the 15-minute rate limiter in
 * login/actions.ts, which only slows guessing down.
 */
export const MAX_FAILED_ATTEMPTS = 3;

/** Shown on the 3rd wrong password AND on every sign-in attempt after it,
 *  whether or not the password is right, so a locked account reads as
 *  locked instead of "incorrect password" (HANDOVER Part 40). */
export const ACCOUNT_LOCKED_MESSAGE =
  "This account is locked after 3 failed sign-in attempts. It can't be used to sign in, even with the correct password. Contact your administrator to unlock it.";
