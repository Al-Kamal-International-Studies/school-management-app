import type en from "./dictionaries/en";

// English is the canonical shape — every other dictionary must structurally
// match it. If you add a key, add it to en.ts first, then TypeScript will
// flag every other dictionary file that's missing it.
export type Dictionary = typeof en;
