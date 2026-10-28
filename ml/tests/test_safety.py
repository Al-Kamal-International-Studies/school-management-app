"""Run: ml/.venv/Scripts/python -m pytest ml/tests -q"""

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from safety.dataset import EVERYDAY_TEST  # noqa: E402
from safety.lexicon import Lexicon, build_lexicon  # noqa: E402
from safety.normalize import normalize  # noqa: E402
from train import exported_score, model_words  # noqa: E402

LEX = Lexicon.from_dict(build_lexicon())
MODEL = json.loads((ROOT.parent / "src/lib/moderation/model.json").read_text(encoding="utf-8"))


def blocked(text: str) -> bool:
    return bool(LEX.check(text)) or (
        not LEX.concern(text)
        and model_words(text) >= MODEL["min_words"]
        and exported_score(MODEL, text) >= MODEL["block_threshold"]
    )


@pytest.mark.parametrize("raw,want", [
    ("S.E.X", "sex"), ("s3x", "sex"), ("F*U*C*K", "fuck"), ("seeeeex", "seex"), ("fück", "fuck"),
    ("10am", "10am"), ("page 45", "page 45"), ("pen15", "penis"), ("أَنْتَ", "انت"), ("مدرســة", "مدرسه"),
])
def test_normalize(raw, want):
    assert normalize(raw) == want


@pytest.mark.parametrize("text", [
    "Here is the link for today's Maths class: https://meet.google.com/abc-defg-hij",
    "Charles Dickens wrote Oliver Twist", "Essex and Sussex", "the analysis of the passage", "Scunthorpe",
    "the therapist", "press the button", "a peacock and a cockroach", "harassment is not allowed",
    "Send me a photo of your homework", "Keep your password secret", "I studied alone in the library",
    "You look tired today, are you okay?", "Your mum called about the trip", "Good night everyone",
    "Test 4: delivered but not yet read", "but why?", "The domes of the mosque", "Bob's homework",
    "Good luck, see you soon", "I will call you after class",
    "الواجب صفحة ١٢", "فرج الله همك", "رمضان كريم يا أستاذة", "امك اتصلت بالمدرسة اليوم", "Eid Mubarak!",
])
def test_school_chat_is_not_blocked(text):
    assert not blocked(text)


@pytest.mark.parametrize("text", [
    "f*ck you", "fuuuuck", "shiiiit", "you b!tch", "s e x", "are u alone?", "don't tell your parents", "this is our little secret",
    "send me a pic of yourself", "what are you wearing", "delete our chat", "add me on snapchat",
    "you're so mature for your age", "kys", "انت لوحدك؟", "هذا سر بيننا", "ارسلي لي صورتك", "شرموطة", "kos omak", "🖕",
])
def test_unsafe_is_blocked(text):
    assert blocked(text)


def test_exported_model_matches_sklearn_threshold_bands():
    assert 0 < MODEL["review_threshold"] < MODEL["block_threshold"] < 1


@pytest.mark.parametrize("text", EVERYDAY_TEST)
def test_everyday_chat_is_never_blocked(text):
    assert not blocked(text)


@pytest.mark.parametrize("text", [
    "I want to kill myself", "i want to die", "im going to end it all", "I don't want to live anymore",
    "everyone would be better off without me", "I keep hurting myself", "I can't take it anymore",
    "بدي موت", "اريد ان انتحر", "تعبت من الحياة", "ما بدي اعيش", "main khudkushi kar lunga",
])
def test_self_harm_is_flagged_not_blocked(text):
    # Muhammad, Part 43: a child asking for help must reach someone
    assert LEX.concern(text), text
    assert not blocked(text), text


def test_bullying_someone_else_is_still_blocked():
    assert blocked("kill yourself") and blocked("kys")


def test_self_harm_word_cannot_smuggle_explicit_content():
    assert blocked("send nudes suicide")
