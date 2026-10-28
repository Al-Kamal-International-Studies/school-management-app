"""Train the message-safety model and export it for the web app.

    ml/.venv/Scripts/python ml/train.py

Writes:
  src/lib/moderation/lexicon.json   layer 1 (word + phrase list)
  src/lib/moderation/model.json     layer 2 (TF-IDF + logistic regression)
  ml/out/parity.json                sample texts with Python's scores, which
                                    the TypeScript test must reproduce
  ml/out/report.txt                 held-out metrics
"""

import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from safety.dataset import EVERYDAY_TEST, FRESH3_SAFE, FRESH3_UNSAFE, FRESH_SAFE, FRESH_UNSAFE, generate  # noqa: E402
from safety.features import analyze  # noqa: E402
from safety.lexicon import Lexicon, build_lexicon  # noqa: E402
from safety.normalize import normalize  # noqa: E402

APP_DIR = ROOT.parent / "src" / "lib" / "moderation"
OUT = ROOT / "out"
MAX_FEATURES = 20000
# Three bands (see HANDOVER Part 42): >= BLOCK is refused; REVIEW..BLOCK is
# delivered but logged for the admins; below REVIEW is normal. Chosen from the
# score spread on hand-written sets #2/#3 (near-identical safe/unsafe pairs):
# unsafe lines scored 0.38-0.97, their safe twins up to 0.68. A single cut
# can't separate those, so the middle band goes to a human.
BLOCK_THRESHOLD = 0.65
REVIEW_THRESHOLD = 0.45
# The model only judges messages with at least this many real words (2+
# characters). On short everyday chat ("are you ok?", "can you hear me?") it
# blocked ~9% of lines (live QA, Part 42): grooming and normal talk share the
# same few words. Short messages are judged by the word/phrase list alone.
MIN_MODEL_WORDS = 5


def model_words(text: str) -> int:
    return sum(1 for w in normalize(text).split() if len(w) >= 2)


def featurize(text: str) -> list[str]:
    return analyze(normalize(text))


def metrics(name: str, pred: np.ndarray, labels: np.ndarray) -> str:
    tp = int(((pred == 1) & (labels == 1)).sum())
    fp = int(((pred == 1) & (labels == 0)).sum())
    fn = int(((pred == 0) & (labels == 1)).sum())
    tn = int(((pred == 0) & (labels == 0)).sum())
    recall = tp / max(1, tp + fn)
    precision = tp / max(1, tp + fp)
    far = fp / max(1, fp + tn)
    return f"{name:<22} recall {recall:6.1%}  precision {precision:6.1%}  false alarms {far:6.2%}  (tp {tp} fp {fp} fn {fn} tn {tn})"


def main() -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(exist_ok=True)

    lexicon_dict = build_lexicon()
    (APP_DIR / "lexicon.json").write_text(json.dumps(lexicon_dict, ensure_ascii=False, indent=0), encoding="utf-8")
    lex = Lexicon.from_dict(lexicon_dict)

    train, test = generate()
    x_all = [t for t, _ in train]
    y_all = np.array([y for _, y in train])
    x_tr, x_val, y_tr, y_val = train_test_split(x_all, y_all, test_size=0.15, random_state=1, stratify=y_all)

    vec = TfidfVectorizer(analyzer=featurize, max_features=MAX_FEATURES, min_df=2, sublinear_tf=True)
    clf = LogisticRegression(C=1.0, max_iter=3000, class_weight="balanced")
    clf.fit(vec.fit_transform(x_tr), y_tr)

    threshold = BLOCK_THRESHOLD
    p_val = clf.predict_proba(vec.transform(x_val))[:, 1]

    x_te = [t for t, _ in test]
    y_te = np.array([y for _, y in test])
    p_te = clf.predict_proba(vec.transform(x_te))[:, 1]
    model_pred = np.array([1 if p >= threshold and model_words(t) >= MIN_MODEL_WORDS else 0 for t, p in zip(x_te, p_te)])
    lex_pred = np.array([1 if lex.check(t) else 0 for t in x_te])
    both = np.maximum(model_pred, lex_pred)

    def combined(texts: list[str], cut: float = threshold) -> np.ndarray:
        model_hits = clf.predict_proba(vec.transform(texts))[:, 1] >= cut
        return np.array([1 if (lex.check(t) or (m and model_words(t) >= MIN_MODEL_WORDS and not lex.concern(t))) else 0 for t, m in zip(texts, model_hits)])

    # unique held-out lines, so repeated samples don't flatter the numbers
    uniq: dict[str, int] = dict(test)
    u_text = list(uniq)
    u_y = np.array([uniq[t] for t in u_text])
    u_pred = combined(u_text)

    fresh_text = FRESH3_UNSAFE + FRESH3_SAFE
    fresh_y = np.array([1] * len(FRESH3_UNSAFE) + [0] * len(FRESH3_SAFE))
    old_text = FRESH_UNSAFE + FRESH_SAFE
    old_y = np.array([1] * len(FRESH_UNSAFE) + [0] * len(FRESH_SAFE))
    fresh_pred = combined(fresh_text)
    misses = [t for t, y, p in zip(u_text, u_y, u_pred) if y == 1 and p == 0]
    false_alarms = [t for t, y, p in zip(u_text, u_y, u_pred) if y == 0 and p == 1]

    report = "\n".join([
        f"train {len(x_tr)}  validation {len(x_val)}  held-out test {len(x_te)} ({len(u_text)} unique)",
        f"features {len(vec.vocabulary_)}  block >= {BLOCK_THRESHOLD}  review >= {REVIEW_THRESHOLD}  model needs >= {MIN_MODEL_WORDS} words",
        metrics("validation (model, block)", (p_val >= threshold).astype(int), y_val),
        "",
        "HELD-OUT TEST (templates, grooming phrasings and bad words never seen in training)",
        metrics("word list only", lex_pred, y_te),
        metrics("model only", model_pred, y_te),
        metrics("word list + model", both, y_te),
        metrics("  unique lines", u_pred, u_y),
        "",
        "EVERYDAY CHAT (short messages, none in training; must be ~0 blocked)",
        metrics("blocked", combined(EVERYDAY_TEST), np.zeros(len(EVERYDAY_TEST), dtype=int)),
        metrics("blocked or flagged", combined(EVERYDAY_TEST, REVIEW_THRESHOLD), np.zeros(len(EVERYDAY_TEST), dtype=int)),
        *[f"  BLOCKED {t}" for t, p in zip(EVERYDAY_TEST, combined(EVERYDAY_TEST)) if p],
        *[f"  flagged {t}" for t, p, b in zip(EVERYDAY_TEST, combined(EVERYDAY_TEST, REVIEW_THRESHOLD), combined(EVERYDAY_TEST)) if p and not b],
        "",
        "HAND-WRITTEN SETS #2 + #3 (near-identical safe/unsafe pairs; used to pick the bands)",
        metrics("blocked", combined(old_text + fresh_text), np.concatenate([old_y, fresh_y])),
        metrics("blocked or flagged", combined(old_text + fresh_text, REVIEW_THRESHOLD), np.concatenate([old_y, fresh_y])),
        "set #3 detail (BLOCKED = refused at the block band):",
        *[f"  {'BLOCKED' if p else 'allowed'} [{'unsafe' if y else 'safe'}] {t}" for t, y, p in zip(fresh_text, fresh_y, fresh_pred)],
        "",
        f"missed unsafe lines ({len(misses)}):",
        *[f"  - {t}" for t in misses],
        f"false alarms on safe lines ({len(false_alarms)}):",
        *[f"  - {t}" for t in false_alarms],
    ])
    (OUT / "report.txt").write_text(report, encoding="utf-8")
    print(report)

    # export: feature -> [idf, coef]; TS rebuilds the same sparse vector
    coef = clf.coef_[0]
    features = {f: [round(float(vec.idf_[i]), 6), round(float(coef[i]), 6)] for f, i in vec.vocabulary_.items()}
    model = {
        "version": 1,
        "kind": "tfidf-char2_5-word1_3+logreg",
        "sublinear_tf": True,
        "intercept": round(float(clf.intercept_[0]), 6),
        "block_threshold": BLOCK_THRESHOLD,
        "review_threshold": REVIEW_THRESHOLD,
        "min_words": MIN_MODEL_WORDS,
        "features": features,
    }
    (APP_DIR / "model.json").write_text(json.dumps(model, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    rng = random.Random(3)
    samples = rng.sample(x_te, 150) + ["", "   ", "Hello Miss Sahar 👋", "S.E.X", "انتَ لوحدك؟", "fück", "ｆｕｃｋ", "meet.google.com/abc-defg-hij", "pen15", "nud35 now", "10am", "covid19", "a4 paper", "grade3!", "blu3 w4ffl3", "c*nt", "w-e-t- -d-r-e-a-m", "I want to kill myself", "i dont want to live anymore", "بدي موت", "انتحار", "the poet committed suicide in 1890"]
    parity = [{"text": t, "normalized": normalize(t), "score": exported_score(model, t), "lexicon": lex.check(t), "concern": lex.concern(t)} for t in samples]
    (OUT / "parity.json").write_text(json.dumps(parity, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nwrote {APP_DIR / 'model.json'} ({(APP_DIR / 'model.json').stat().st_size // 1024} KB)")


def exported_score(model: dict, text: str) -> float:
    """Score using ONLY the exported JSON (exactly what TypeScript does)."""
    counts: dict[str, int] = {}
    for f in featurize(text):
        if f in model["features"]:
            counts[f] = counts.get(f, 0) + 1
    weights = {f: (1 + math.log(c)) * model["features"][f][0] for f, c in counts.items()}
    norm = math.sqrt(sum(w * w for w in weights.values())) or 1.0
    z = model["intercept"] + sum(w / norm * model["features"][f][1] for f, w in weights.items())
    return 1 / (1 + math.exp(-z))


if __name__ == "__main__":
    main()
