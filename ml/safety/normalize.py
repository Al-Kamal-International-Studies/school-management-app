"""Text normalisation shared by the lexicon, the model's features and the
TypeScript runtime (src/lib/moderation/normalize.ts mirrors this file
step for step; ml/tests/test_parity.py checks they agree).

Goal: make disguised words look like the plain word, so `S.E.X`, `s3x`,
`seeeex`, `F*U*C*K` and Arabic with diacritics/tatweel all reduce to the
same token the word list and the model were trained on.
"""

import re
import unicodedata

# Arabic diacritics (harakat), Quranic marks and tatweel
_AR_MARKS = re.compile("[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]")
_AR_MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})

LEET_DIGITS = {"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b"}
LEET_SYMBOLS = {"@": "a", "$": "s", "!": "i", "*": ""}


def _is_latin(ch: str) -> bool:
    return "a" <= ch <= "z"


def _deleet(text: str) -> str:
    """Map look-alike digits/symbols to letters, but only *inside* a word, so
    `s3x` -> `sex` while `10am`, `page 45` and `2026` are left alone.

    A digit maps when the previous (already mapped) char is a latin letter
    and the next char is a latin letter, another leet digit, or the end of
    the word (`pen15`, `nud35`). A symbol (@ $ ! *) maps when it touches a
    latin letter on either side.
    """
    out: list[str] = []
    n = len(text)
    for i, ch in enumerate(text):
        prev = out[-1] if out else ""
        nxt = text[i + 1] if i + 1 < n else ""
        if ch in LEET_DIGITS:
            if _is_latin(prev) and (_is_latin(nxt) or nxt in LEET_DIGITS or not nxt.isalnum()):
                out.append(LEET_DIGITS[ch])
                continue
        elif ch in LEET_SYMBOLS:
            if _is_latin(prev) or _is_latin(nxt):
                out.append(LEET_SYMBOLS[ch])
                continue
        out.append(ch)
    return "".join(out)


_NOT_WORD = re.compile("[^a-z0-9\u0621-\u064a]+")
_REPEAT3 = re.compile(r"(.)\1{2,}")
_REPEAT2 = re.compile(r"(.)\1+")


def _join_spelled_out(tokens: list[str]) -> list[str]:
    """`s e x` / `s.e.x` arrive as runs of single characters: glue any run of
    3+ single-character tokens back into one word."""
    out: list[str] = []
    run: list[str] = []
    for tok in tokens + [""]:
        if len(tok) == 1:
            run.append(tok)
            continue
        if len(run) >= 3:
            out.append("".join(run))
        else:
            out.extend(run)
        run = []
        if tok:
            out.append(tok)
    return out


def strip_marks(text: str) -> str:
    # NFKD splits accents (and Arabic hamza/madda) off their letters so the
    # mark-stripping can drop them: `fück` -> `fuck`, `أ` -> `ا`
    t = unicodedata.normalize("NFKD", text).lower()
    t = _AR_MARKS.sub("", t)
    return t.translate(_AR_MAP)


def normalize(text: str) -> str:
    t = strip_marks(text)
    t = _deleet(t)
    t = _NOT_WORD.sub(" ", t)
    tokens = _join_spelled_out(t.split())
    # again: `s.3.x` only becomes `s3x` once the spelled-out letters are glued
    t = _deleet(" ".join(tokens))
    return _REPEAT3.sub(r"\1\1", t)


def dedupe(text: str) -> str:
    """Every run of a repeated char collapsed to one (`fuuuck` -> `fuck`)."""
    return _REPEAT2.sub(r"\1", text)
