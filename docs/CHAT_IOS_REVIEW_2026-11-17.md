# Chat and iPhone input review — Jack

Date: 17 November 2026 (Dubai). Branch `mark/chat-composer-ios`, commits `2c30dae` and `146cc47`, base `4eb620e`. Working tree was clean at review start.

## Verdict: CHANGES REQUIRED

The global 16px form rule and send animation are reasonable changes. One reproducible P2 defect remains in the keyboard hook. Fix it before merge. Actual iPhone keyboard and status-bar behavior remains unverified; the synthetic preview does not establish that the user's keyboard-gap complaint is resolved. No application code changed in this review.

## Findings

### IOS-1 — P2: pinch zoom is misclassified as an on-screen keyboard

File: `src/components/chat/useKeyboardViewport.ts:27` (the `open` condition), with the fixed-frame CSS in `src/components/chat/chat.css:1081`.

The hook considers a keyboard open whenever a text control in the frame is focused, the layout viewport is at most 1023px wide, and `innerHeight - visualViewport.height > 100`. Pinch zoom also reduces visualViewport.height. The condition never checks visualViewport.scale. A user who zooms while a field is focused (including with a hardware keyboard, so no on-screen keyboard exists) incorrectly gets `data-kb=true`, a fixed-height frame, and keyboard-specific spacing. The width is still the full layout width, not the zoomed viewport width. This changes layout during intentional accessibility zoom and can leave controls outside the visible area.

**Reproduced against the actual transpiled hook**, with useEffect and browser event surfaces stubbed, not a reimplementation of its predicate: innerHeight 800, visualViewport.height 400, scale 2, focused input, narrow layout. Emitting the viewport resize event produced `data-kb=true`, `--vv-h=400px` despite no keyboard. Scale 1 / height 480 correctly activated the keyboard path as a positive control.

**Required fix:** distinguish zoom from keyboard occlusion. At minimum, do not activate this fixed-frame override while the viewport is pinch-zoomed; preserve native zoom/panning and restore normal layout when zoom begins. Keep a small scale tolerance if needed. Do not fix it by disabling user zoom or clamping maximum-scale. Add behavioral coverage for scale 1 keyboard open/closed, zoom without a keyboard, zoom while already pinned, focus leaving the frame, and returning to scale 1. Document any intentionally unsupported combination.

### IOS-2 — P3: hook cleanup leaves stale CSS variables

File: `src/components/chat/useKeyboardViewport.ts:47-53`.

The cleanup removes listeners and `data-kb` but leaves `--vv-top` and `--vv-h`. The same actual-hook probe confirmed both properties remain after cleanup. Normally the element unmounts and the missing attribute prevents the CSS from applying, so this is not a current release blocker by itself. Reuse the reset helper for closed state and cleanup to remove all hook-owned DOM state. Also apply the initial state once on mounting and consider breakpoint change observation; the current hook only samples on viewport/focus events.

### IOS-3 — validation gap: real iPhone keyboard behavior not demonstrated

The handoff's forced `--vv-top/--vv-h` check verifies CSS positioning, not iOS viewport event sequencing, scroll movement, focus retention or keyboard dismissal. Mobile desktop emulation does not generate a real iPhone keyboard. Keep release acceptance open until the original affected device is tested on a reachable preview/release candidate. This is not a claim that the gap still exists; it is a missing acceptance result.

## What passed review

- `146cc47` centralizes input sizing in the global stylesheet, includes textarea/select/editable content, excludes checkbox/radio/range/color/file/button/hidden inputs, and leaves fine-pointer desktop styles alone. No maximum-scale or user-scalable=no was introduced. The iPhone login and chat auto-focus zoom fix is plausible and supported by the size correction, but not physically verified by Jack.
- `pointer: coarse` describes the primary pointing device, not every device with touch. Avoid saying this guarantees every hybrid/tablet setup. Check attached-mouse/trackpad devices if claiming support; this does not block the requested iPhone fix.
- The fixed-frame CSS clears the existing 560px minimum height and negative margins while active. It uses visual viewport offsetTop/height and removes the composer's extra safe-area padding in the narrow-pane layout. The inspected DashboardShell/PageTransition path has no transform on the frame's ancestors; the page transition is opacity-only.
- Enter/send behavior is unchanged: desktop Enter sends, Shift+Enter does not; composition events are guarded; coarse-pointer Enter inserts a line. This review does not claim pointer classification is equivalent to detecting a physical keyboard.
- Send uses the existing optimistic-send path and restores input focus. The new mousedown handler prevents default focus transfer. No message delivery, authorization, moderation or receipt logic changed. No messages were sent during review.
- The icon remounts with each send; alternating parent classes restart the hold animation. Existing reduced-motion CSS disables the animations. Existing RTL SVG mirroring and the animation's directional variable are present. The animation denotes submission, not delivery; existing ticks/errors still report delivery state.
- ResizeObserver is disconnected on cleanup and only auto-scrolls when its last recorded state was near the bottom. Device tests must ensure a reader looking at older messages is not pulled down while the keyboard opens.
- Apple statusBarStyle default is a limited metadata change, not a mechanism for removing out-of-scope browser chrome. Mark records the user's confirmation that reinstalling from the final domain removed the bars. Treat that as user-reported resolution of the install-origin issue, not evidence that this branch's keyboard changes work. White status-bar treatment in dark mode remains a known visual tradeoff.

## Verification performed by Jack

- `npm run typecheck`: pass.
- `npm run lint` (full repository): pass.
- `npm run test:onboarding`: 2,185/2,185 pass, 44 lessons.
- Actual-hook isolated event probe: confirmed IOS-1 and IOS-2, and confirmed the scale-1 keyboard positive case. The probe ran from stdin and left no temporary file or test account.
- Source inspection of both commits, chat layout, viewport hook, scrolling/send paths, root metadata, global CSS, dashboard ancestors, reduced-motion and RTL rules.
- No full build attempted in this round. The handoff does not provide a successful production build for these two new commits. A successful build of earlier `4eb620e` does not establish this branch's build result. Run a full build on the corrected final commit and retain the result.

## Mark's fix and acceptance checklist

1. Fix IOS-1 and add the behavioral regression cases. Clean up IOS-2 while editing the hook. Return the final commit and test results.
2. Run typecheck, full lint, onboarding suite, new hook tests, diff whitespace checks and a full production build. Fix failures rather than relying on the previous branch's checks.
3. On the original iPhone, with the app installed from https://www.alkamal.app: focus login fields and chat composer, open/close the keyboard repeatedly, type multiple lines, send twice, use emoji/search, switch chat, rotate, and test intentional pinch zoom. Verify the composer stays reachable, Back/dismiss restores layout, and no empty band remains. Record iOS/browser version and installation mode.
4. Verify the newest message stays visible when already at the bottom, and that reading older messages preserves the reading position. Test sending failures as well as success using controlled fixtures; do not send real messages as part of an unapproved test.
5. Check EN/AR, 390/320/430px, light/dark, reduced motion, keyboard-only button activation, desktop Enter/Shift+Enter/IME, and Android if claiming Android keyboard support. Check status-bar overlap and dark-mode appearance on-device.
6. Global font changes need representative authenticated-form layout checks: compact timetable/grades fields, dialogs, filters/selects and longer Arabic placeholders. Exactly 16px also overrides intentionally larger text; retain or document that choice rather than assuming it is only a minimum-size rule.

## Not done / not checked

No real iPhone/Android test, signed-in Messages/form walkthrough, production write, account change, authentication test, build, commit, merge, push or deployment. The 2FA reset recorded in Part 65 was a separate user-authorized operation; it was not repeated or audited here. No credentials were opened. Shared TEAM and parent HANDOVER files are outside this session's writable roots, so this review/handoff is recorded here for Mark instead of modifying those files.

## Message to Mark

Jack's review of `2c30dae` + `146cc47` is complete: CHANGES REQUIRED. Fix the reproduced pinch-zoom/keyboard misclassification, clean up the viewport CSS properties, add the behavioral checks and obtain a complete build. Then demonstrate the keyboard behavior on the originally affected iPhone and return the evidence. The 16px rule, send-animation direction and existing Enter policy do not need redesign. Report any further test failure and resolve it before requesting approval.

Reference checks: VisualViewport distinguishes its pinch-zoom scale from its height; pointer media queries describe the primary pointing device. See https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport/scale and https://drafts.csswg.org/mediaqueries/#pointer. These references explain the API semantics; the defect evidence above is from executing this branch's hook.
