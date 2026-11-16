/**
 * A tiny made-up word list for the PRACTICE filter only. The real school filter
 * is a bigger list plus a model that runs on the server; none of it is used here.
 */
const WORDS = {
  en: ["idiot", "stupid", "dumb", "shut up", "hate you"],
  ar: ["غبي", "أحمق", "اخرس"],
};

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا");

/** True when the text contains one of the practice words as a whole word. */
export function practiceFilterBlocks(text: string): boolean {
  const t = ` ${normalise(text).replace(/[^\p{L}\p{N}\s]/gu, " ")} `.replace(/\s+/g, " ");
  return [...WORDS.en, ...WORDS.ar].some((w) => t.includes(` ${normalise(w)} `));
}
