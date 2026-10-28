// The message-safety filter's runtime: layer 1 (word/phrase list, mirror of
// ml/safety/lexicon.py) + layer 2 (the TF-IDF/logistic-regression model
// trained by ml/train.py, mirror of ml/safety/features.py). Pure functions over
// the exported JSON, so the parity test can run it under plain Node.
import { dedupe, normalize, stripMarks } from "./normalize.ts";

export interface LexiconData {
  words: string[];
  words_dedup: string[];
  substrings: string[];
  phrases: string[];
  /** self-harm / suicide wording: delivered and flagged, never blocked by the model */
  concern_phrases: string[];
  emoji: string[];
}

export interface ModelData {
  intercept: number;
  block_threshold: number;
  review_threshold: number;
  /** the model only judges messages with at least this many 2+ char words */
  min_words: number;
  /** feature -> [idf, coefficient] */
  features: Record<string, [number, number]>;
}

export type ModerationAction = "allow" | "flag" | "block";

export interface ModerationResult {
  action: ModerationAction;
  /** "word" | "substring" | "phrase" | "masked" | "emoji" | "model" | "self_harm" */
  reasons: string[];
  score: number;
}

const MAX_SPAN = 4;
const CHAR_MIN = 2;
const CHAR_MAX = 5;
const WORD_MAX = 3;
const MASKED = /[a-z*]+/g;
const DOUBLE = /(.)\1/;

function spans(text: string): string[] {
  const toks = text.split(" ").filter(Boolean);
  const out: string[] = [];
  for (let k = 1; k <= MAX_SPAN; k++) {
    for (let i = 0; i + k <= toks.length; i++) out.push(toks.slice(i, i + k).join(" "));
  }
  return out;
}

function maskedPatterns(raw: string): RegExp[] {
  const out: RegExp[] = [];
  for (const tok of stripMarks(raw).match(MASKED) ?? []) {
    const stars = tok.split("*").length - 1;
    if (stars >= 1 && stars <= 3 && tok.length - stars >= 2) {
      out.push(new RegExp(`^${tok.replace(/\*/g, "[a-z]?")}$`));
    }
  }
  return out;
}

export function analyze(normalized: string): string[] {
  const feats: string[] = [];
  const tokens = normalized.split(" ").filter(Boolean);
  for (const tok of tokens) {
    const w = ` ${tok} `;
    for (let k = CHAR_MIN; k <= CHAR_MAX; k++) {
      for (let i = 0; i + k <= w.length; i++) feats.push(w.slice(i, i + k));
    }
  }
  for (let k = 1; k <= WORD_MAX; k++) {
    for (let i = 0; i + k <= tokens.length; i++) feats.push("w:" + tokens.slice(i, i + k).join(" "));
  }
  return feats;
}

export function createModerator(lexicon: LexiconData, model: ModelData) {
  const words = new Set(lexicon.words);
  const wordsDedup = new Set(lexicon.words_dedup);
  const phrases = lexicon.phrases.map((p) => new RegExp(`(?:^| )(?:${p})(?: |$)`));
  const concernPhrases = lexicon.concern_phrases.map((p) => new RegExp(`(?:^| )(?:${p})(?: |$)`));
  const concern = (raw: string) => {
    const n = normalize(raw);
    return concernPhrases.some((p) => p.test(n));
  };
  const singleWords = lexicon.words.filter((w) => !w.includes(" ") && w.length >= 3 && /^[\x00-\x7f]*$/.test(w));

  function lexiconReasons(raw: string): string[] {
    const reasons: string[] = [];
    if (lexicon.emoji.some((e) => raw.includes(e))) reasons.push("emoji");
    const n = normalize(raw);
    const nd = dedupe(n);
    // collapsed spelling only when the typed text repeats a letter (`fuuuck`);
    // otherwise "but" would match "butt" (found in live QA, Part 42)
    if (spans(n).some((s) => words.has(s) || (DOUBLE.test(s) && wordsDedup.has(dedupe(s))))) reasons.push("word");
    if (lexicon.substrings.some((s) => n.includes(s) || nd.includes(s))) reasons.push("substring");
    if (phrases.some((p) => p.test(n))) reasons.push("phrase");
    const masked = maskedPatterns(raw);
    if (masked.length && masked.some((m) => singleWords.some((w) => m.test(w)))) reasons.push("masked");
    return reasons;
  }

  function score(raw: string): number {
    const counts = new Map<string, number>();
    for (const f of analyze(normalize(raw))) {
      if (f in model.features) counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    const weights = new Map<string, number>();
    let sq = 0;
    for (const [f, c] of counts) {
      const w = (1 + Math.log(c)) * model.features[f]![0];
      weights.set(f, w);
      sq += w * w;
    }
    const norm = Math.sqrt(sq) || 1;
    let z = model.intercept;
    for (const [f, w] of weights) z += (w / norm) * model.features[f]![1];
    return 1 / (1 + Math.exp(-z));
  }

  // Short everyday chat ("are you ok?", "can you hear me?") shares its few
  // words with grooming lines; the model blocked ~9% of it in QA (Part 42).
  // So short messages are judged by the word/phrase list alone.
  const modelWords = (raw: string) => normalize(raw).split(" ").filter((w) => w.length >= 2).length;

  // Self-harm wording (Muhammad, Part 43): delivered and flagged, never blocked
  // by the model. A word/phrase-list hit still blocks (else adding "suicide"
  // would smuggle anything through) — that block is logged as a concern too.
  function moderate(raw: string): ModerationResult {
    const reasons = lexiconReasons(raw);
    const s = score(raw);
    const worried = concern(raw);
    if (reasons.length) return { action: "block", reasons: worried ? [...reasons, "self_harm"] : reasons, score: s };
    if (worried) return { action: "flag", reasons: ["self_harm"], score: s };
    const judged = modelWords(raw) >= model.min_words;
    if (judged && s >= model.block_threshold) return { action: "block", reasons: ["model"], score: s };
    if (judged && s >= model.review_threshold) return { action: "flag", reasons: ["model"], score: s };
    return { action: "allow", reasons: [], score: s };
  }

  return { moderate, lexiconReasons, score, concern };
}
