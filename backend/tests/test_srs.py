import pytest
from datetime import datetime, timedelta

from backend.services.srs import update_card_after_review


class DummyCard:
    def __init__(self):
        self.repetition = 0
        self.interval = 0
        self.easiness_factor = 2.5
        self.last_reviewed_date = None
        self.next_review_date = None


def test_srs_quality_5_increases_interval():
    c = DummyCard()
    update_card_after_review(c, 5)
    assert c.repetition == 1
    assert c.interval == 1
    assert c.easiness_factor > 2.5 or c.easiness_factor == 2.5


def test_srs_quality_0_resets():
    c = DummyCard()
    c.repetition = 3
    c.interval = 10
    update_card_after_review(c, 0)
    assert c.repetition == 0
    assert c.interval == 1


def test_srs_repeated_reviews():
    c = DummyCard()
    update_card_after_review(c, 5)  # r=1
    update_card_after_review(c, 5)  # r=2
    update_card_after_review(c, 5)  # r=3
    assert c.repetition == 3
    assert c.interval >= 6
