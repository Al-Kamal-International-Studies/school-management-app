import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy — primary brand color (Al Kamal International Studies).
        // Every step resolves through a CSS custom property (globals.css's
        // `:root` block), not a literal hex, so the whole palette lives in
        // one place. `<alpha-value>` is Tailwind's own placeholder token —
        // it keeps opacity modifiers like `bg-navy-800/60` working. Values
        // here must stay in sync with the CSS variable *names* defined there.
        navy: {
          50: "rgb(var(--color-navy-50) / <alpha-value>)",
          100: "rgb(var(--color-navy-100) / <alpha-value>)",
          200: "rgb(var(--color-navy-200) / <alpha-value>)",
          300: "rgb(var(--color-navy-300) / <alpha-value>)",
          400: "rgb(var(--color-navy-400) / <alpha-value>)",
          500: "rgb(var(--color-navy-500) / <alpha-value>)",
          600: "rgb(var(--color-navy-600) / <alpha-value>)",
          700: "rgb(var(--color-navy-700) / <alpha-value>)",
          800: "rgb(var(--color-navy-800) / <alpha-value>)",
          900: "rgb(var(--color-navy-900) / <alpha-value>)",
          950: "rgb(var(--color-navy-950) / <alpha-value>)",
        },
        // Warm gold — accent color, used sparingly for premium touches.
        // Same CSS-variable indirection as navy above.
        gold: {
          50: "rgb(var(--color-gold-50) / <alpha-value>)",
          100: "rgb(var(--color-gold-100) / <alpha-value>)",
          200: "rgb(var(--color-gold-200) / <alpha-value>)",
          300: "rgb(var(--color-gold-300) / <alpha-value>)",
          400: "rgb(var(--color-gold-400) / <alpha-value>)",
          500: "rgb(var(--color-gold-500) / <alpha-value>)",
          600: "rgb(var(--color-gold-600) / <alpha-value>)",
          700: "rgb(var(--color-gold-700) / <alpha-value>)",
          800: "rgb(var(--color-gold-800) / <alpha-value>)",
          900: "rgb(var(--color-gold-900) / <alpha-value>)",
        },
        // `brand` has always been a duplicate of navy's 50-900 steps (see
        // its original literal values, identical to navy's) — rather than
        // defining a second, parallel set of CSS variables that could drift
        // out of sync, it now aliases navy's variables directly.
        brand: {
          50: "rgb(var(--color-navy-50) / <alpha-value>)",
          100: "rgb(var(--color-navy-100) / <alpha-value>)",
          200: "rgb(var(--color-navy-200) / <alpha-value>)",
          300: "rgb(var(--color-navy-300) / <alpha-value>)",
          400: "rgb(var(--color-navy-400) / <alpha-value>)",
          500: "rgb(var(--color-navy-500) / <alpha-value>)",
          600: "rgb(var(--color-navy-600) / <alpha-value>)",
          700: "rgb(var(--color-navy-700) / <alpha-value>)",
          800: "rgb(var(--color-navy-800) / <alpha-value>)",
          900: "rgb(var(--color-navy-900) / <alpha-value>)",
        },
      },
      // Type system (DESIGN.md): IBM Plex Sans runs every control, row and
      // paragraph; Source Serif 4 is for display lines only (page titles,
      // hero numbers). IBM Plex Sans Arabic sits second in both stacks so
      // Arabic glyphs — which neither Latin face contains — fall through to
      // the same family instead of a system font.
      //
      // The families are named directly (they are the @font-face names
      // next/font registers from layout.tsx) rather than via var(--font-*):
      // next/font puts a metric-matched local fallback ("IBM Plex Sans
      // Fallback" = Arial) inside each variable, and Arial contains Arabic
      // glyphs, so Arabic text stopped at Arial and never reached IBM Plex
      // Sans Arabic (found live in the computed stack). Turbopack ignores
      // adjustFontFallback:false, so naming the families is the reliable fix.
      fontFamily: {
        sans: ["\"IBM Plex Sans\"", "\"IBM Plex Sans Arabic\"", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["\"Source Serif 4\"", "\"IBM Plex Sans Arabic\"", "Georgia", "serif"],
      },
      // One radius family: 6px controls (rounded-md), 8px small containers
      // (rounded-lg), 10px cards (rounded-xl). xl/2xl/3xl are pulled in from
      // Tailwind's softer defaults so the few remaining rounded-2xl call
      // sites can't drift back to a bubbly 16px.
      borderRadius: {
        xl: "0.625rem",
        "2xl": "0.75rem",
        "3xl": "0.875rem",
      },
      boxShadow: {
        // Hairline-first elevation: surfaces are separated by a 1px border,
        // and shadows only add a whisper of depth. Literal navy (rgb 15 33
        // 49) regardless of center — neutral depth, not a brand accent.
        soft: "0 1px 2px 0 rgb(15 33 49 / 0.04)",
        card: "0 1px 2px 0 rgb(15 33 49 / 0.05)",
        "card-hover": "0 2px 6px -1px rgb(15 33 49 / 0.08), 0 1px 2px 0 rgb(15 33 49 / 0.05)",
        // Overlays only (menus, dialogs): the one place a
        // real shadow communicates "this floats above the page".
        overlay: "0 12px 32px -8px rgb(15 33 49 / 0.22), 0 2px 6px -2px rgb(15 33 49 / 0.10)",
        // Kept as a name so old call sites compile; no more gold glow.
        gold: "0 1px 2px 0 rgb(15 33 49 / 0.05)",
      },
      backgroundImage: {
        // Dedicated gradient-stop variables rather than reusing e.g.
        // navy-950/800/700 directly — AKIS's existing gradient uses
        // bespoke stops (#123a5e, #1c4d78) that don't exactly match any
        // named scale step, and "AKIS stays pixel-exact" is a hard
        // requirement here.
        //
        // Redesign (DESIGN.md, "one named gradient"): navy-gradient is now
        // a quiet vertical "brand depth" — nearly solid navy, lifting only
        // slightly toward the top — instead of a diagonal three-stop sweep.
        // gold-gradient is flattened to solid gold: gold is a signal for the
        // selected state, never paint.
        "navy-gradient":
          "linear-gradient(180deg, rgb(var(--color-navy-gradient-via)) 0%, rgb(var(--color-navy-gradient-from)) 420px)",
        "gold-gradient": "linear-gradient(rgb(var(--color-gold-500)), rgb(var(--color-gold-500)))",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Speech-bubble "pop" entrance for WelcomeRobot — same fill-mode
        // discipline as fade-in/fade-in-up below (see that comment): this is
        // a delayed, mount-gated entrance (it waits for the robot itself to
        // settle first), so it needs `both` too or it'd flash at full
        // opacity/scale before its delay, then snap invisible.
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.75) translateY(4px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        // Continuous wave loop for WelcomeRobot's free arm — purely
        // decorative and never gates content visibility (its rest state,
        // 0deg, is a perfectly normal-looking lowered arm), so unlike
        // fade-in/fade-in-up/pop-in above this deliberately has no mount
        // dependency to protect against in the first place: plain CSS,
        // `infinite`, no `both` needed since it never has a delay to hide.
        wave: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%": { transform: "rotate(14deg)" },
          "40%": { transform: "rotate(-8deg)" },
          "60%": { transform: "rotate(14deg)" },
          "80%": { transform: "rotate(0deg)" },
        },
      },
      animation: {
        // `both` fill-mode is load-bearing, not decoration: without it,
        // animation-fill-mode defaults to "none", which means a delayed
        // animation (every staggered FadeUpItem, the login page's tagline/
        // features/copyright) renders at full opacity the instant the page
        // paints, then SNAPS to the keyframe's `from` state (opacity:0) the
        // moment its delay elapses, before fading back up. That reads to a
        // real user as "the text appears, then disappears" — content
        // flashing visible and then vanishing — which is exactly the bug
        // this was reported as. `both` holds the `from` state during the
        // delay (nothing flashes before its turn) and holds the `to` state
        // after the animation ends (nothing reverts once it's finished).
        // Redesign: one animation per change, ~180ms. fade-in-up's travel
        // is cut to 4px (see keyframes) so a route change reads as a calm
        // settle, not a slide.
        "fade-in": "fade-in 0.18s ease-out both",
        "fade-in-up": "fade-in-up 0.22s cubic-bezier(0.2, 0, 0, 1) both",
        "pop-in": "pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        wave: "wave 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
