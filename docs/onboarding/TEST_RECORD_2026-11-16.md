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

## Not run: needs a signed-in account (Muhammad's call)

Local dev uses the production Supabase project. A signed-in run therefore signs in to a real account, and Finish writes `has_seen_tour` / `tour_version_seen` on production. That is a live action, and I can't enter real passwords. The following are verified only in code and the unit test, not in a browser:

- first launch redirect, with the original deep link kept in `?next=`
- Continue later and Finish returning to that deep link
- sign-out and sign-in in the same tab re-opening unfinished onboarding, with progress kept
- "Open the real page" refusing to leave silently when the save fails
- a failed Finish save showing the error, then a retry
- replay after completion

Options:

1. Muhammad signs in to a test account in the browser pane himself, and I drive the rest.
2. He OKs a throwaway test account on production that is deleted afterwards.
3. Run it on a preview deploy.
