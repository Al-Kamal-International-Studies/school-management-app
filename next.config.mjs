const isDev = process.env.NODE_ENV === "development";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Content-Security-Policy — see docs/SECURITY.md F9.
//
// Deliberately the Next.js-documented "Without Nonces" CSP pattern
// (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md),
// not the stricter nonce + 'strict-dynamic' pattern that same doc also
// describes. Reason: this app leans heavily on Framer Motion (login page
// robots, page transitions, sidebar highlight, feedback mascot, confetti —
// all documented as deliberate, significant design investment in both
// handover docs), which animates by mutating each element's inline `style`
// attribute directly. CSP nonces only ever cover `<style>` elements and
// `<script>` elements — the spec has no nonce mechanism for the `style=""`
// attribute at all, and the values Framer Motion writes change every
// animation frame, so hash-allowlisting isn't practical either. The Next.js
// docs list "inline styles" as the #1 common CSP violation for exactly this
// reason. `style-src` therefore keeps 'unsafe-inline'; tightening it further
// would require moving off Framer Motion's inline-style animation model, not
// a header change. `script-src` still blocks arbitrary *remote* script
// loading (the delivery mechanism for most real-world XSS payloads), and
// object-src/base-uri/form-action/frame-ancestors are all fully enforced
// regardless. Revisit a nonce-based script-src in Phase 2 once there's room
// to regression-test every animated component individually — see
// docs/SECURITY.md Phase 2.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:${supabaseUrl ? ` ${supabaseUrl}` : ""};
  font-src 'self';
  connect-src 'self'${supabaseUrl ? ` ${supabaseUrl}` : ""};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          // Legacy fallback for tools that predate frame-ancestors support —
          // CSP's frame-ancestors above is the real, modern enforcement.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
