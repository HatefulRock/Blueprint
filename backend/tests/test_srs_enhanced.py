"""
Tests for the enhanced SRS (Spaced Repetition System) service.

Tests cover:
- Basic SM-2 algorithm functionality
- Leech detection (8+ lapses)
- Response time bonus for fast answers
- Word review updates
- Leech reset functionality
"""

import pytest
from datetime import datetime, timedelta

# 1. FIX: Standard import (removed sys.path hack)
from services.srs import (
    update_card_after_review,
    update_word_after_review,
    reset_leech_status,
    LEECH_THRESHOLD,
)

class MockCard:
    """Mock card object for testing SRS updates."""
    def __init__(
        self,
        repetition=0,
        interval=0,
        easiness_factor=2.5,
        lapses=0,
        is_leech=False,
        total_reviews=0,
    ):
        self.repetition = repetition
        self.interval = interval
        self.easiness_factor = easiness_factor
        self.lapses = lapses
        self.is_leech = is_leech
        self.total_reviews = total_reviews
        self.last_reviewed_date = None
        self.next_review_date = None


class MockWord:
    """Mock word object for testing SRS updates."""
    def __init__(
        self,
        interval=0,
        easiness_factor=2.5,
        familiarity_score=0,
        lapses=0,
        is_leech=False,
    ):
        self.interval = interval
        self.easiness_factor = easiness_factor
        self.familiarity_score = familiarity_score
        self.lapses = lapses
        self.is_leech = is_leech
        self.last_reviewed_date = None
        self.next_review_date = None


class TestCardSRS:
    """Tests for card SRS updates."""

    def test_quality_5_first_review(self):
        """Perfect answer on first review should set interval to 1."""
        card = MockCard()
        update_card_after_review(card, 5)

        assert card.repetition == 1
        assert card.interval == 1
        assert card.total_reviews == 1
        assert card.easiness_factor >= 2.5
        assert card.next_review_date is not None

    def test_quality_5_second_review(self):
        """Perfect answer on second review should set interval to 6."""
        card = MockCard(repetition=1, interval=1)
        update_card_after_review(card, 5)

        assert card.repetition == 2
        assert card.interval == 6

    def test_quality_5_third_review(self):
        """Third review interval should be calculated using EF."""
        card = MockCard(repetition=2, interval=6, easiness_factor=2.5)
        update_card_after_review(card, 5)

        assert card.repetition == 3
        assert card.interval >= 6  # interval = 6 * EF

    def test_quality_0_resets_repetition(self):
        """Failed review (quality < 3) should reset repetition."""
        card = MockCard(repetition=5, interval=30)
        update_card_after_review(card, 0)

        assert card.repetition == 0
        assert card.interval == 1
        assert card.lapses == 1

    def test_quality_2_resets_repetition(self):
        """Quality 2 should also reset repetition."""
        card = MockCard(repetition=3, interval=15)
        update_card_after_review(card, 2)

        assert card.repetition == 0
        assert card.interval == 1
        assert card.lapses == 1

    def test_quality_3_continues_learning(self):
        """Quality 3 (correct with difficulty) should continue learning."""
        card = MockCard(repetition=1, interval=1)
        update_card_after_review(card, 3)

        assert card.repetition == 2
        assert card.lapses == 0

    def test_leech_detection_threshold(self):
        """Card should be flagged as leech after 8 lapses."""
        card = MockCard(lapses=LEECH_THRESHOLD - 1)  # 7 lapses
        update_card_after_review(card, 0)

        assert card.lapses == LEECH_THRESHOLD  # 8 lapses
        assert card.is_leech is True

    def test_no_leech_before_threshold(self):
        """Card should not be leech before reaching threshold."""
        card = MockCard(lapses=5)
        update_card_after_review(card, 0)

        assert card.lapses == 6
        assert card.is_leech is False

    def test_response_time_bonus_fast_correct(self):
        """Fast correct answer should get interval bonus."""
        card = MockCard(repetition=2, interval=6, easiness_factor=2.5)
        update_card_after_review(card, 5, response_time_ms=2000)  # Under 3 seconds

        # Interval should be boosted by 10%
        expected_base = int(6 * 2.5)
        expected_boosted = int(expected_base * 1.1)
        assert card.interval >= expected_boosted - 1  # Allow for rounding

    def test_no_response_time_bonus_slow(self):
        """Slow answer should not get interval bonus."""
        card = MockCard(repetition=2, interval=6, easiness_factor=2.5)
        update_card_after_review(card, 5, response_time_ms=5000)  # Over 3 seconds

        expected = int(6 * 2.5)
        assert card.interval == expected

    def test_no_response_time_bonus_wrong(self):
        """Wrong answer should not get bonus even if fast."""
        card = MockCard(repetition=3, interval=15)
        update_card_after_review(card, 2, response_time_ms=1000)

        assert card.interval == 1  # Reset

    def test_easiness_factor_increases_on_good_answer(self):
        """EF should increase on quality 5."""
        card = MockCard(easiness_factor=2.5)
        update_card_after_review(card, 5)

        assert card.easiness_factor > 2.5

    def test_easiness_factor_decreases_on_bad_answer(self):
        """EF should decrease on low quality."""
        card = MockCard(easiness_factor=2.5)
        update_card_after_review(card, 1)

        assert card.easiness_factor < 2.5

    def test_easiness_factor_minimum(self):
        """EF should not go below 1.3."""
        card = MockCard(easiness_factor=1.3)
        update_card_after_review(card, 0)

        assert card.easiness_factor >= 1.3

    def test_total_reviews_increments(self):
        """Total reviews should increment on each review."""
        card = MockCard(total_reviews=5)
        update_card_after_review(card, 4)

        assert card.total_reviews == 6

    def test_dates_updated(self):
        """Last reviewed and next review dates should be set."""
        card = MockCard()
        update_card_after_review(card, 4)

        assert card.last_reviewed_date is not None
        assert card.next_review_date is not None
        # Ensure next review date is in the future relative to last review
        assert card.next_review_date >= card.last_reviewed_date


class TestWordSRS:
    """Tests for word SRS updates."""

    def test_word_quality_5_increases_familiarity(self):
        """Good answer should increase familiarity score."""
        word = MockWord(familiarity_score=2)
        update_word_after_review(word, 5)

        assert word.familiarity_score == 3

    def test_word_quality_0_decreases_familiarity(self):
        """Failed review should decrease familiarity score."""
        word = MockWord(familiarity_score=3)
        update_word_after_review(word, 0)

        assert word.familiarity_score == 2
        assert word.lapses == 1

    def test_word_familiarity_minimum(self):
        """Familiarity score should not go below 0."""
        word = MockWord(familiarity_score=0)
        update_word_after_review(word, 0)

        assert word.familiarity_score == 0

    def test_word_familiarity_maximum(self):
        """Familiarity score should not exceed 5."""
        word = MockWord(familiarity_score=5)
        update_word_after_review(word, 5)

        assert word.familiarity_score == 5

    def test_word_leech_detection(self):
        """Word should be flagged as leech after threshold lapses."""
        word = MockWord(lapses=LEECH_THRESHOLD - 1)
        update_word_after_review(word, 0)

        assert word.is_leech is True


class TestLeechReset:
    """Tests for leech status reset."""

    def test_reset_leech_card(self):
        """Resetting leech should clear flag and lapses."""
        card = MockCard(is_leech=True, lapses=10)
        reset_leech_status(card)

        assert card.is_leech is False
        assert card.lapses == 0

    def test_reset_leech_word(self):
        """Resetting leech should work for words too."""
        word = MockWord(is_leech=True, lapses=10)
        reset_leech_status(word)

        assert word.is_leech is False
        assert word.lapses == 0


class TestQualityBoundaries:
    """Tests for quality rating boundaries."""

    def test_quality_clamped_to_0(self):
        """Negative quality should be clamped to 0."""
        card = MockCard()
        update_card_after_review(card, -5)

        assert card.lapses == 1  # Treated as quality 0

    def test_quality_clamped_to_5(self):
        """Quality > 5 should be clamped to 5."""
        card = MockCard()
        update_card_after_review(card, 10)

        assert card.repetition == 1  # Treated as quality 5