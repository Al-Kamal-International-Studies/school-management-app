import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy — primary brand color (Al Kamal International Studies)
        navy: {
          50: "#eef3f8",
          100: "#d7e3ee",
          200: "#b0c8dd",
          300: "#82a6c6",
          400: "#5580a8",
          500: "#3a6288",
          600: "#284b6c",
          700: "#1c3a56",
          800: "#152c42",
          900: "#0f2131",
          950: "#0b2138",
        },
        // Warm gold — accent color, used sparingly for premium touches
        gold: {
          50: "#fdf8ec",
          100: "#faedc7",
          200: "#f4d888",
          300: "#eec158",
          400: "#e6ad3f",
          500: "#d4af37",
          600: "#b8860b",
          700: "#946b0a",
          800: "#78560f",
          900: "#644811",
        },
        brand: {
          50: "#eef3f8",
          100: "#d7e3ee",
          200: "#b0c8dd",
          300: "#82a6c6",
          400: "#5580a8",
          500: "#3a6288",
          600: "#284b6c",
          700: "#1c3a56",
          800: "#152c42",
          900: "#0f2131",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 33 49 / 0.04), 0 1px 3px 0 rgb(15 33 49 / 0.06)",
        card: "0 1px 3px 0 rgb(15 33 49 / 0.06), 0 4px 12px -2px rgb(15 33 49 / 0.08)",
        "card-hover": "0 4px 8px 0 rgb(15 33 49 / 0.08), 0 12px 24px -4px rgb(15 33 49 / 0.12)",
        gold: "0 4px 14px 0 rgb(212 175 55 / 0.25)",
      },
      backgroundImage: {
        "navy-gradient": "linear-gradient(135deg, #0b2138 0%, #123a5e 55%, #1c4d78 100%)",
        "gold-gradient": "linear-gradient(135deg, #f3d878 0%, #d4af37 50%, #b8860b 100%)",
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
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-up": "fade-in-up 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
