import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy — primary brand color (Al Kamal International Studies).
        // Every step resolves through a CSS custom property (globals.css's
        // `:root` block), not a literal hex — that's what lets a single
        // compiled class like `.text-navy-800` render AKIS's navy on one
        // page and AKET's steel-blue on another, purely from a `data-center`
        // attribute upstream in the DOM, with no per-component `aket:`
        // variant needed anywhere. `<alpha-value>` is Tailwind's own
        // placeholder token (not a variable I define) — it lets opacity
        // modifiers like `bg-navy-800/60` keep working exactly as before.
        // See globals.css for the actual AKIS/AKET values and
        // HANDOVER.md-style reasoning; values here must stay in sync with
        // the CSS variable *names* (not values) defined there.
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
        // Same CSS-variable indirection as navy above (AKET renders this
        // token family as an amber/orange accent instead).
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
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        // These three stay literal navy (rgb 15 33 49) regardless of center
        // — they're neutral elevation/depth shadows used on white/light
        // surfaces app-wide, not a brand accent, so there's nothing for
        // AKET to differentiate here (matching how e.g. slate-* neutrals
        // stay constant too).
        soft: "0 1px 2px 0 rgb(15 33 49 / 0.04), 0 1px 3px 0 rgb(15 33 49 / 0.06)",
        card: "0 1px 3px 0 rgb(15 33 49 / 0.06), 0 4px 12px -2px rgb(15 33 49 / 0.08)",
        "card-hover": "0 4px 8px 0 rgb(15 33 49 / 0.08), 0 12px 24px -4px rgb(15 33 49 / 0.12)",
        // This one IS the brand accent glow (btn-gold), so it follows the
        // gold-500 CSS variable like everything else in this file.
        gold: "0 4px 14px 0 rgb(var(--color-gold-500) / 0.25)",
      },
      backgroundImage: {
        // Dedicated gradient-stop variables rather than reusing e.g.
        // navy-950/800/700 directly — AKIS's existing gradient uses
        // bespoke stops (#123a5e, #1c4d78) that don't exactly match any
        // named scale step, and "AKIS stays pixel-exact" is a hard
        // requirement here. AKET's stops are chosen scale steps (see
        // globals.css) tuned so white text and the active-nav-item accent
        // icon both clear WCAG contrast against the lightest stop.
        "navy-gradient":
          "linear-gradient(135deg, rgb(var(--color-navy-gradient-from)) 0%, rgb(var(--color-navy-gradient-via)) 55%, rgb(var(--color-navy-gradient-to)) 100%)",
        "gold-gradient":
          "linear-gradient(135deg, rgb(var(--color-gold-gradient-from)) 0%, rgb(var(--color-gold-gradient-via)) 50%, rgb(var(--color-gold-gradient-to)) 100%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
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
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        "pop-in": "pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        wave: "wave 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
