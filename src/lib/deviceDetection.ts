/**
 * Heuristic, client-only device-family detection for the passkey-setup
 * suggestion (src/app/setup-passkey) — picks which authenticator copy/icon
 * to show ("Face ID" vs "fingerprint or PIN" vs "Windows Hello / Touch ID /
 * PIN"). No browser API guarantees this with certainty (there is no
 * "what authenticator hardware does this device have" API — WebAuthn itself
 * deliberately abstracts that away), so this is best-effort UI copy only:
 * never used for any actual security/auth decision, and every branch below
 * degrades to a sensible generic message rather than guessing wrong loudly.
 *
 * Prefers the modern User-Agent Client Hints API (`navigator.userAgentData`)
 * where available (Chromium-based browsers) since it's a structured,
 * explicitly-provided platform string rather than a regex over a spoofable
 * free-text header — falls back to parsing `navigator.userAgent`/
 * `navigator.platform` everywhere else (Safari, Firefox, older browsers).
 */

export type PasskeyDeviceKind = "ios" | "android" | "desktop";

// Minimal shape for the parts of the (not-yet-universally-typed)
// UA-Client-Hints API this file actually reads. Declared locally rather
// than widening `Navigator` globally, since this is the only file that
// touches it.
interface NavigatorUAData {
  platform?: string;
  mobile?: boolean;
}

function getUAData(): NavigatorUAData | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
}

export function detectPasskeyDeviceKind(): PasskeyDeviceKind {
  if (typeof navigator === "undefined") return "desktop";

  const uaData = getUAData();
  const uaDataPlatform = uaData?.platform?.toLowerCase() ?? "";
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";

  // iPadOS 13+ identifies as "MacIntel" in both userAgent and
  // navigator.platform (Apple deliberately made iPad request desktop sites
  // by default) — the one reliable tell is that a real Mac has no touch
  // points, while an iPad reports several.
  const isIPadOnMacUA = platform === "MacIntel" && navigator.maxTouchPoints > 1;

  if (uaDataPlatform === "ios" || /iPhone|iPad|iPod/i.test(userAgent) || isIPadOnMacUA) {
    return "ios";
  }

  if (uaDataPlatform === "android" || /Android/i.test(userAgent)) {
    return "android";
  }

  return "desktop";
}
