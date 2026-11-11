// Checks how the ID card handles names: Arabic is kept (not turned into "?"),
// Latin/Arabic runs come out in visual order, and truncation puts the "…" at
// the end of the name. Uses the card's real font files, so run from the repo root:
//   node --conditions=react-server scripts/idcard-text.test.ts
import { RLM, drawable, loadIdCardFonts, mixedWidth, splitRuns } from "../src/lib/idcard/fonts.ts";

const fonts = await loadIdCardFonts();
const latin = fonts.sans600.font;
const arabic = fonts.arabic600.font;

let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail++;
    console.error(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
  }
}

const name = "محمد أحمد";
check("Arabic name is kept", drawable(latin, arabic, name), name);
check("Latin name is kept", drawable(latin, arabic, "Talal A M Awad"), "Talal A M Awad");
check("characters in neither font become ?", drawable(latin, arabic, "A日B"), "A?B");

check("Latin only: one run", splitRuns("Talal Awad", latin, arabic), [{ text: "Talal Awad", face: "latin" }]);
check("Arabic with the space between words: one Arabic run", splitRuns(name, latin, arabic), [{ text: name, face: "arabic" }]);
check("colon prefix stays Latin, name is the Arabic run", splitRuns(`: ${name}`, latin, arabic), [
  { text: ": ", face: "latin" },
  { text: name, face: "arabic" },
]);
check("mixed name: Latin, Arabic, Latin in order", splitRuns("Talal محمد Awad", latin, arabic).map((r) => r.face), ["latin", "arabic", "latin"]);
check("space between Latin and Arabic stays Latin", splitRuns("Ali محمد", latin, arabic), [
  { text: "Ali ", face: "latin" },
  { text: "محمد", face: "arabic" },
]);
check("no Arabic font: RLM is dropped", splitRuns(`Ali…${RLM}`, latin, null), [{ text: "Ali…", face: "latin" }]);

// Truncated Arabic: the "…" is the end of the name, i.e. the LEFT edge of the Arabic run.
check("truncated Arabic: ellipsis first, then the run", splitRuns(`: عبد الرحمن…${RLM}`, latin, arabic), [
  { text: ": ", face: "latin" },
  { text: "…", face: "latin" },
  { text: "عبد الرحمن", face: "arabic" },
]);
check("truncated Latin: ellipsis stays last", splitRuns("Abdelrahman…", latin, arabic), [{ text: "Abdelrahman…", face: "latin" }]);

check("Arabic has real width", mixedWidth(latin, arabic, name, 21) > 50, true);
check("RLM adds no width", mixedWidth(latin, arabic, `A…${RLM}`, 21), mixedWidth(latin, arabic, "A…", 21));

if (fail) {
  console.error(`\n${fail} check(s) failed`);
  process.exit(1);
}
console.log("idcard text checks: all passed");
