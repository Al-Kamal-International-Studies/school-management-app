import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Source_Serif_4 } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { getLocale } from "@/lib/i18n/getLocale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { dirForLocale } from "@/lib/i18n/locales";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { getTheme } from "@/lib/theme/getTheme";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import "./globals.css";

// One sans for every control, row and paragraph (IBM Plex Sans), its Arabic
// sibling so the `ar` locale renders in the same family instead of a system
// fallback, and one serif reserved for display lines only — page titles and
// hero numbers (Source Serif 4). See DESIGN.md, and tailwind.config.ts for
// why the font stacks name these families directly.
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["400", "500", "600"],
});

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600"],
});

export const metadata: Metadata = {
  title: {
    default: "Al Kamal International Studies",
    template: "%s · Al Kamal International Studies",
  },
  description: "Manage classes, attendance, grades, and communication in one place.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Al Kamal",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2138",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  const dict = await getDictionary(locale);
  const dir = dirForLocale(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${sans.variable} ${arabic.variable} ${display.variable}${theme === "dark" ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body>
        <OfflineBanner />
        <ThemeProvider theme={theme}>
          <LocaleProvider locale={locale} dict={dict}>
            {children}
          </LocaleProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
