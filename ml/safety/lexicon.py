"""Layer 1 of the filter: the word/phrase list.

`build_lexicon()` merges the LDNOOBW lists with ml/data/lexicon_extra.json and
writes the result the TypeScript runtime loads (src/lib/moderation/lexicon.json).
`Lexicon.check()` is the reference implementation that
src/lib/moderation/lexicon.ts mirrors.
"""

import json
import re
from dataclasses import dataclass
from pathlib import Path

from .normalize import dedupe, normalize, strip_marks

DATA = Path(__file__).resolve().parent.parent / "data"
MAX_SPAN = 4  # longest multi-word entry, in tokens
EMOJI = ["🖕"]


def _read_list(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def build_lexicon() -> dict:
    extra = json.loads((DATA / "lexicon_extra.json").read_text(encoding="utf-8"))
    raw = _read_list(DATA / "ldnoobw" / "en.txt") + _read_list(DATA / "ldnoobw" / "ar.txt") + extra["add_words"]
    exclude = {normalize(w) for w in extra["exclude"]}
    words: set[str] = set()
    for w in raw:
        n = normalize(w)
        if n and n not in exclude and len(n.split()) <= MAX_SPAN:
            words.add(n)
            # `w-e-t d-r-e-a-m` normalises to one glued token
            if " " in n and len(n) >= 6:
                words.add(n.replace(" ", ""))
    # the de-duplicated spelling catches `fuuuck`/`seeex`; too short once
    # deduped (`ass` -> `as`) and it would hit ordinary words, so skip those
    words_dedup = sorted({dedupe(w) for w in words if len(dedupe(w).replace(" ", "")) >= 3})
    substrings = sorted({normalize(s) for s in extra["substrings"]})
    for p in extra["phrases"] + extra["concern_phrases"]:
        re.compile(p)
    return {
        "source": "LDNOOBW (CC-BY-4.0) + ml/data/lexicon_extra.json",
        "words": sorted(words),
        "words_dedup": words_dedup,
        "substrings": substrings,
        "phrases": extra["phrases"],
        "concern_phrases": extra["concern_phrases"],
        "emoji": EMOJI,
    }


def spans(text: str) -> set[str]:
    """Every run of 1..MAX_SPAN consecutive tokens."""
    toks = text.split()
    return {" ".join(toks[i : i + k]) for k in range(1, MAX_SPAN + 1) for i in range(len(toks) - k + 1)}


_MASKED = re.compile(r"[a-z*]+")
_DOUBLE = re.compile(r"(.)\1")


def masked_tokens(raw: str) -> list[re.Pattern]:
    """`c*nt`, `ny*pho`, `*ock`: a star standing in for hidden letters. Each
    such token becomes a pattern where every star is "one letter or none"."""
    out = []
    for tok in _MASKED.findall(strip_marks(raw)):
        stars = tok.count("*")
        if 1 <= stars <= 3 and len(tok) - stars >= 2:
            out.append(re.compile("^" + tok.replace("*", "[a-z]?") + "$"))
    return out


@dataclass
class Lexicon:
    words: set[str]
    words_dedup: set[str]
    substrings: list[str]
    phrases: list[re.Pattern]
    emoji: list[str]
    concern_phrases: list[re.Pattern]

    @property
    def single_words(self) -> list[str]:
        return [w for w in self.words if " " not in w and len(w) >= 3 and w.isascii()]

    @classmethod
    def from_dict(cls, d: dict) -> "Lexicon":
        return cls(
            set(d["words"]),
            set(d["words_dedup"]),
            d["substrings"],
            [re.compile(f"(?:^| )(?:{p})(?: |$)") for p in d["phrases"]],
            d["emoji"],
            [re.compile(f"(?:^| )(?:{p})(?: |$)") for p in d["concern_phrases"]],
        )

    def concern(self, raw: str) -> bool:
        """Self-harm / suicide wording: never blocked, always flagged (Part 43)."""
        n = normalize(raw)
        return any(p.search(n) for p in self.concern_phrases)

    def check(self, raw: str) -> list[str]:
        """Reasons this text is blocked; empty when it is clean."""
        reasons: list[str] = []
        if any(e in raw for e in self.emoji):
            reasons.append("emoji")
        n = normalize(raw)
        nd = dedupe(n)
        # The collapsed spelling only counts when the TYPED text repeats a
        # letter (`fuuuck`). Collapsing plain words too made "but" match
        # "butt" and "domes" match "dommes" (found in live QA, Part 42).
        if spans(n) & self.words or any(_DOUBLE.search(s) and dedupe(s) in self.words_dedup for s in spans(n)):
            reasons.append("word")
        if any(s in n or s in nd for s in self.substrings):
            reasons.append("substring")
        if any(p.search(n) for p in self.phrases):
            reasons.append("phrase")
        masked = masked_tokens(raw)
        if masked and any(m.match(w) for m in masked for w in self.single_words):
            reasons.append("masked")
        return reasons
