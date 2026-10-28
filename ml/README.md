# Message safety filter (HANDOVER Part 42)

Every chat message passes through two layers before it is stored. The checks run in
`src/lib/moderation` in under a millisecond, inside the Next.js server, so there is no Python service to host.

1. **Word and phrase list** (`lexicon.json`). The English and Arabic LDNOOBW lists
   (`data/ldnoobw`, CC-BY-4.0) plus `data/lexicon_extra.json`, which adds Arabizi and Roman-Urdu insults,
   grooming phrases, and words removed because they are normal at school (فرج, "suck", "escort", ...).
   Text is normalised first (`safety/normalize.py`), so `S.E.X`, `s3x`, `seeex`, `c*nt` and Arabic with
   diacritics all match.
2. **Model** (`model.json`). TF-IDF over character 2-5 grams plus word 1-3 grams, scored by logistic
   regression. It is trained on generated English and Arabic school chat (`safety/dataset.py`) and catches
   grooming that uses no bad words, such as "are you alone", "delete our chat" or "you're so mature for your age".

| Signal | What happens |
|---|---|
| word/phrase hit (any length), or model >= 0.65 | **blocked**: never stored or delivered; logged; admins notified |
| model 0.45 – 0.65 | **flagged**: delivered, logged for admin review |
| otherwise | normal |

The model only judges messages with **5+ words** (counting only tokens of 2+ characters). Short everyday chat
("are you ok?", "can you hear me?") shares its few words with grooming lines. In live QA the model blocked
about 9% of such lines, so short messages are judged by the word/phrase list alone. That list still catches
short grooming lines like "are you alone" and "our secret".

## Retrain

```bash
python -m venv ml/.venv
ml/.venv/Scripts/python -m pip install scikit-learn numpy pytest
ml/.venv/Scripts/python ml/train.py              # writes src/lib/moderation/*.json, ml/out/*
ml/.venv/Scripts/python -m pytest ml/tests -q
node scripts/moderation-parity.test.ts           # TypeScript must match Python exactly
```

`ml/out/report.txt` has the latest metrics. If you change `normalize.py` or `features.py`, make the
same change in `src/lib/moderation/normalize.ts` / `engine.ts`; the parity test fails until both agree.

## Making it better with real data

The training data is synthetic, because no labelled school-chat grooming corpus exists. Each time an
admin marks a log entry **harmful** or **ok** on Admin → Message safety, `message_flags.verdict` collects
real, labelled AKIS examples. Add those to `safety/dataset.py` and retrain. Real data fixes the model's
known weak spot: safe and unsafe sentences that differ by one word ("lovely handwriting" / "lovely figure").
