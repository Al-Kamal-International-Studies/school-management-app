// Mirror of ml/safety/normalize.py, step for step. If you change one, change
// both and re-run `node scripts/moderation-parity.test.ts` (it compares this
// file's output with Python's on ml/out/parity.json).

const AR_MARKS = /[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/gu;
const AR_MAP: Record<string, string> = { "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي" };
const LEET_DIGITS: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b" };
const LEET_SYMBOLS: Record<string, string> = { "@": "a", "$": "s", "!": "i", "*": "" };
const NOT_WORD = /[^a-z0-9\u0621-\u064a]+/g;
const REPEAT3 = /(.)\1{2,}/g;
const REPEAT2 = /(.)\1+/g;
// constructor form: the \p{} literal needs an ES2018 target
const ALNUM = new RegExp("[\\p{L}\\p{N}]", "u");

const isLatin = (ch: string) => ch >= "a" && ch <= "z";

export function stripMarks(text: string): string {
  let t = text.normalize("NFKD").toLowerCase().replace(AR_MARKS, "");
  t = Array.from(t, (ch) => AR_MAP[ch] ?? ch).join("");
  return t;
}

function deleet(text: string): string {
  const chars = Array.from(text);
  const out: string[] = [];
  chars.forEach((ch, i) => {
    const prev = out.length ? out[out.length - 1]! : "";
    const next = chars[i + 1] ?? "";
    if (ch in LEET_DIGITS) {
      if (isLatin(prev) && (isLatin(next) || next in LEET_DIGITS || !ALNUM.test(next))) {
        out.push(LEET_DIGITS[ch]!);
        return;
      }
    } else if (ch in LEET_SYMBOLS) {
      if (isLatin(prev) || isLatin(next)) {
        out.push(LEET_SYMBOLS[ch]!);
        return;
      }
    }
    out.push(ch);
  });
  return out.join("");
}

function joinSpelledOut(tokens: string[]): string[] {
  const out: string[] = [];
  let run: string[] = [];
  for (const tok of [...tokens, ""]) {
    if (tok.length === 1) {
      run.push(tok);
      continue;
    }
    if (run.length >= 3) out.push(run.join(""));
    else out.push(...run);
    run = [];
    if (tok) out.push(tok);
  }
  return out;
}

export function normalize(text: string): string {
  let t = deleet(stripMarks(text));
  t = t.replace(NOT_WORD, " ");
  // again: `s.3.x` only becomes `s3x` once the spelled-out letters are glued
  t = deleet(joinSpelledOut(t.split(" ").filter(Boolean)).join(" "));
  return t.replace(REPEAT3, "$1$1");
}

export function dedupe(text: string): string {
  return text.replace(REPEAT2, "$1");
}
