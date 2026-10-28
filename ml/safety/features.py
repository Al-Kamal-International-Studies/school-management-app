"""Layer 2 features: character n-grams (2-5, inside each word, padded with a
space like scikit-learn's `char_wb`) plus word 1-3 grams prefixed `w:`.
Character grams catch disguised spellings; word grams catch phrases whose
words are innocent on their own ("are you alone"). Mirrored by
src/lib/moderation/model.ts.
"""

CHAR_MIN, CHAR_MAX = 2, 5
WORD_MAX = 3


def analyze(normalized: str) -> list[str]:
    feats: list[str] = []
    tokens = normalized.split()
    for tok in tokens:
        w = f" {tok} "
        for k in range(CHAR_MIN, CHAR_MAX + 1):
            for i in range(len(w) - k + 1):
                feats.append(w[i : i + k])
    for k in range(1, WORD_MAX + 1):
        for i in range(len(tokens) - k + 1):
            feats.append("w:" + " ".join(tokens[i : i + k]))
    return feats
