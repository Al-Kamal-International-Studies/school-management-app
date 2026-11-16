# Onboarding: test record for Jack's re-review (2026-11-16)

Mark (Claude). Branch `mark/onboarding-v2`, fix commit after `bc77a8f`.

## Automated

| Check | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx eslint` on onboarding, login, nav, (onboarding) route, test script | pass |
| `node scripts/onboarding.test.ts` (now also `npm run test:onboarding`, and a CI step) | 2057 / 2057 (was 2035; +22 for return path, session flags, wiring) |
| `git diff --check 528c13c..` | clean |
| `next build` (production) | pass |

## Browser, dev preview (`/dev/onboarding-preview`, no sign-in, nothing saved to the server)

| Case | Desktop (1024) | 390 px |
|---|---|---|
| Admin + oversight, EN | loads, no errors, no sideways scroll | same |
| Admin + oversight, AR | RTL, no errors | same |
| Teacher, EN | loads, no errors | same |
| Teacher, AR | RTL, no errors | same, plus the not-saved warning (below) |
| Student, EN / AR | loads, no errors / RTL | same |
| Parent, EN / AR | loads, no errors / RTL | same |

- **Messages ticks:** in the teacher's Maths group, the message sent in practice moves to Delivered and stays there after 3 s. That matches the live `tickFor` rule: Read only shows once every other member has read it. The chat-list preview now shows the single tick, as the live list does (`MessagesShell.tsx:240`). Direct chats still reach Read. The new copy appears in EN and AR.
- **Blocked storage + Continue later:** with `Storage.prototype.setItem` made to throw, "Continue later" stays on the page and shows "Your progress couldn't be saved on this device…" with the choices Stay here and Leave anyway. Stay here dismisses it. Checked in AR at 390 px: RTL, no sideways scroll.
- **Pause and resume:** each role reopened at the position saved earlier (for example, the parent resumed on "Almost there", and the teacher on Messages).
- Console errors across all runs: none.

## Signed-in run (dev server against production Supabase, Muhammad's OK)

Throwaway teacher `onboarding.test@alkamalinternational.com` was created with `scripts/onboarding-test-account.mjs`. Muhammad typed the password at both sign-ins; I drove everything else. The account was deleted afterwards: 0 profiles left with that email, and the password file was removed.

| Scenario | Result |
|---|---|
| First launch from a deep link (`/login?next=/teacher/attendance?from=deeplink`) | Landed on `/getting-started?next=%2Fteacher%2Fattendance%3Ffrom%3Ddeeplink`, question 1 |
| Continue later | Back on `/teacher/attendance?from=deeplink`; banner "0 of 16 done"; progress saved at question 2 |
| Resume from the banner | Reopened on the same question |
| Sign out in the same tab | sessionStorage flag cleared, localStorage progress kept, landed on `/login` |
| Sign in again in the same tab | Auto-opened `/getting-started?next=%2Fteacher` on the saved question |
| Blocked storage (setItem throws) | "Progress is saved" note shown while storage worked. With storage blocked, "Open the real page" stayed on the page and showed the not-saved warning, and the note switched to "isn't saving". "Leave anyway" opened `/messages` |
| Failed Finish save (server-action fetch rejected) | "We couldn't save that. Try again." shown; stayed on Finish, button enabled |
| Retry | Landed on `/teacher/attendance?from=finish`; banner gone; local progress cleared; DB `has_seen_tour=true`, `tour_version_seen=10` |
| Replay after completion | Sidebar "Getting started" opened the full flow (Step 1 of 24) |
| After completion, new tab session | `/teacher` stays put; no redirect, no banner |

Console: only the dev server's HMR websocket errors.

Found during the run, fixed after it: the banner's Continue link dropped the page's query string. It now keeps the path, query and hash. Checked by typecheck, lint and tests only, not in the browser.
