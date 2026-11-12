import type { ReactNode } from "react";

/**
 * The Light Rail icon set (spec §11 / §16): 24×24 stroke icons, 1.8 stroke,
 * round caps and joins. Path data is the spec's, verbatim; the extras
 * (x, arrow-left, chevron-down, clock, document, image, single tick, alert)
 * are drawn in the same style.
 */
const PATHS: Record<string, ReactNode> = {
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  grp: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <path d="M16 5a3 3 0 010 6M18 14c2 .8 3 3 3 6" />
    </>
  ),
  dir: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8 17c.6-2 2.2-3 4-3s3.4 1 4 3" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  dots: (
    <>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  tick: <path d="M2 12l4 4 8-9M10 15l1 1 9-10" />,
  "tick-single": <path d="M5 12.5l4.5 4.5L19 7" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14c1 1.5 2.5 2.2 4 2.2s3-.7 4-2.2M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  send: <path d="M4 12l16-8-6 16-3-7z" />,
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 11l5-3v8l-5-3" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  document: <path d="M7 3h7l5 5v13H7zM14 3v5h5" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-8 9" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
