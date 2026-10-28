// Checks the TypeScript filter (src/lib/moderation) gives exactly the same
// normalisation, word-list reasons and model scores as the Python reference
// on ml/out/parity.json (written by ml/train.py). Run after every retrain:
//   node scripts/moderation-parity.test.ts
import { readFileSync } from "node:fs";
import { createModerator, type LexiconData, type ModelData } from "../src/lib/moderation/engine.ts";
import { normalize } from "../src/lib/moderation/normalize.ts";

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf-8"));
const lexicon = read("../src/lib/moderation/lexicon.json") as LexiconData;
const model = read("../src/lib/moderation/model.json") as ModelData;
const samples = read("../ml/out/parity.json") as { text: string; normalized: string; score: number; lexicon: string[]; concern: boolean }[];
const { lexiconReasons, score, moderate, concern } = createModerator(lexicon, model);

let fail = 0;
for (const s of samples) {
  const n = normalize(s.text);
  const r = lexiconReasons(s.text);
  const sc = score(s.text);
  const problems = [
    n !== s.normalized && `normalize ${JSON.stringify(n)} != ${JSON.stringify(s.normalized)}`,
    r.join() !== s.lexicon.join() && `lexicon ${r} != ${s.lexicon}`,
    Math.abs(sc - s.score) > 1e-9 && `score ${sc} != ${s.score}`,
    concern(s.text) !== s.concern && `concern ${concern(s.text)} != ${s.concern}`,
  ].filter(Boolean);
  if (problems.length) {
    fail++;
    console.log(`FAIL ${JSON.stringify(s.text)}: ${problems.join("; ")}`);
  }
}

// behaviour spot checks (the full metrics live in ml/out/report.txt)
const expect: [string, string][] = [
  ["Here is the link for today's Maths class: https://meet.google.com/abc-defg-hij", "allow"],
  ["Charles Dickens and the Essex analysis", "allow"],
  ["الواجب صفحة ١٢ تمرين ٣", "allow"],
  ["Test 4: delivered but not yet read", "allow"],
  ["where are you?", "allow"],
  ["are you ok?", "allow"],
  ["I can't hear you", "allow"],
  ["see you soon", "allow"],
  ["I want to kill myself", "flag"],
  ["بدي موت", "flag"],
  ["kill yourself", "block"],
  ["send nudes suicide", "block"],
  ["are u alone rn?", "block"],
  ["promise me you won't show these messages to anyone", "block"],
  ["s.3.x", "block"],
  ["f*ck you", "block"],
  ["send me a pic of yourself", "block"],
  ["هذا سر بيننا", "block"],
];
for (const [text, want] of expect) {
  const got = moderate(text).action;
  if (got !== want) {
    fail++;
    console.log(`FAIL ${JSON.stringify(text)}: ${got} (want ${want})`);
  }
}

console.log(`${samples.length + expect.length - fail}/${samples.length + expect.length} passed`);
process.exit(fail ? 1 : 0);
