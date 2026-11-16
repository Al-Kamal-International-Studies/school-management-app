# Design system — Al Kamal

The rules every screen follows, for students, staff, management and parents.
Read this and `tailwind.config.ts` + `src/app/globals.css` before adding UI;
use the tokens there, don't invent new colours, sizes or fonts.

## Who it is for

One institutional app for four roles. Each dashboard opens with one serif
title, at most one filled (primary) button, and the information that role acts
on first (today's schedule and upcoming work for students and teachers, the
child's standing for parents, counts and pending items for management).

## Type

| Role | Face | Size / weight |
|---|---|---|
| Body, controls, rows | IBM Plex Sans | 14px / 400; labels 500 |
| Arabic (every glyph) | IBM Plex Sans Arabic | same scale |
| Page title (`.page-title`) | Source Serif 4 | 28px / 600 |
| Detail header (`.page-title-compact`) | Source Serif 4 | 22px / 600 |
| Section heading (`.section-title`, `.card-title`) | IBM Plex Sans | 15px / 600 |
| Eyebrow / grey second line (`.eyebrow`) | IBM Plex Sans | 13px / 500, slate-500 |
| Hero number (stat tiles) | Source Serif 4 | 32px / 600, tabular |

- The serif is for display only. Buttons, rows, labels and body use the sans.
- Two weights carry hierarchy (500 labels, 600 titles); secondary text is grey.
- Sentence case everywhere. No all-caps labels (the crest wordmark and the
  printed ID card are the only exceptions).
- Numbers use tabular figures (`table`, `time`, `.tabular`).
- Font stacks name the families directly (see the comment in
  `tailwind.config.ts`): next/font's injected Arial fallback would otherwise
  swallow Arabic glyphs before they reach IBM Plex Sans Arabic.

## Colour

- **Ink:** navy (`navy-*`, defined once as CSS variables in globals.css).
  Primary buttons, links, selection on light surfaces.
- **Greys:** slate, one cool family.
- **Accent:** gold, only on the dark brand surfaces — the sidebar's selected
  rule and the sign-in tagline. Never a button, gradient or
  glow.
- **Status, one meaning each:** green = done / present / approved,
  amber = pending / needs attention, red = failed / absent / rejected.
  Info alerts use navy, not a separate blue.

## Surfaces and shape

- Radius: 6px controls (`rounded-md`), 8px small containers (`rounded-lg`),
  10px cards (`rounded-xl`).
- Cards hold objects (a table, a form, a list). A list of rows is ONE card
  with hairline dividers (`ListCard` / `ListRow` in `components/ui/List.tsx`),
  not a card per row.
- Elevation is a 1px border plus a whisper of shadow (`shadow-card`). Real
  shadow (`shadow-overlay`) only on things that float: menus and dialogs.
- One brand surface: the quiet vertical `bg-navy-gradient` with the crest's
  8-point star lattice fading out from the top (`AuthBackground`). Used by the
  sidebar, the sign-in panel and the welcome screens only.

## Layout

- 8px grid, 16px side gutter on phones (24 / 32px on larger screens).
- Content column capped at 1280px. Narrow pages (forms, details, settings)
  are centred with `mx-auto max-w-*`.
- 28px between page sections (`space-y-7`); a heading sits 12px above its
  content.
- Rows are 44–56px: optional leading element, title with optional grey
  second line, one trailing element.
- Buttons are 40px (44px on touch devices); inputs match.

## Motion

- One animation per change: the route cross-fades (~180ms, `PageTransition`).
  Nothing inside a page staggers in (`FadeUp*` are layout-only now).
- `prefers-reduced-motion` shows the final state immediately.
- No decorative loops: no drifting blobs, mascots or confetti.

## Icons and images

- Lucide only, 1.75 stroke, 18px in navigation. Icons sit beside a visible
  label; only close / menu / back may stand alone (with an `aria-label`).
- No emoji in the interface (the language cards no longer show flags).

## Never

Gradient buttons, gold glows, mascots, pulsing blobs, confetti, all-caps
labels, a second filled button on a screen, coloured icon tiles used as
decoration, status colours used for anything but status.

## Checklist before shipping UI

1. Screenshot at 390px, then 320px and 1366px; no horizontal scroll.
2. Check light, dark and Arabic (RTL).
3. List every gradient, extra colour, extra font and extra filled button you
   added, and remove what breaks these rules.
