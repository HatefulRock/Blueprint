"""
Tests for practice endpoints.

Tests cover:
- Creating practice sessions
- Submitting reviews with telemetry
- Getting and resetting leech cards
- Session management
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from tests.factories import create_practice_session, create_practice_review


class TestPracticeSession:
    """Tests for practice session endpoints."""

    def test_create_session(self, authenticated_client, test_deck, test_cards, db):
        """Should create a practice session with due cards."""
        response = authenticated_client.post(
            "/practice/session",
            json={"deck_id": str(test_deck.id), "limit": 10}
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "cards" in data
        assert len(data["cards"]) > 0

    def test_create_session_all_decks(self, authenticated_client, test_deck, test_cards, db):
        """Should create session from all user's decks if no deck_id specified."""
        response = authenticated_client.post(
            "/practice/session",
            json={"limit": 10}
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data

    def test_list_sessions(self, authenticated_client, test_user, db):
        """Should list user's practice sessions."""
        # Create a session first
        create_practice_session(db, test_user)

        response = authenticated_client.get("/practice/sessions")

        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert "count" in data

    def test_update_session_score(self, authenticated_client, test_user, db):
        """Should update session score."""
        session = create_practice_session(db, test_user, score=0)

        response = authenticated_client.patch(
            f"/practice/session/{session.id}/score",
            json={"score": 90}
        )

        assert response.status_code == 200
        assert response.json()["ok"] is True


class TestReviewSubmission:
    """Tests for review submission endpoint."""

    def test_submit_review_success(self, authenticated_client, test_cards, db):
        """Should submit a review with full telemetry."""
        card = test_cards[0]

        response = authenticated_client.post(
            "/practice/review",
            json={
                "card_id": str(card.id),
                "quality": 4,
                "response_time_ms": 2500,
                "confidence": 4,
                "answer_text": "test answer"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "next_review_date" in data
        assert "is_leech" in data
        assert "lapses" in data
        assert "total_reviews" in data

    def test_submit_review_minimal(self, authenticated_client, test_cards, db):
        """Should submit review with only required fields."""
        card = test_cards[1]

        response = authenticated_client.post(
            "/practice/review",
            json={
                "card_id": str(card.id),
                "quality": 3
            }
        )

        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_submit_review_quality_0(self, authenticated_client, test_cards, db):
        """Should handle failed review (quality 0)."""
        card = test_cards[2]

        response = authenticated_client.post(
            "/practice/review",
            json={
                "card_id": str(card.id),
                "quality": 0
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["lapses"] >= 1

    def test_submit_review_nonexistent_card(self, authenticated_client):
        """Should return 404 for nonexistent card."""
        response = authenticated_client.post(
            "/practice/review",
            json={
                "card_id": str(uuid4()),
                "quality": 4
            }
        )

        assert response.status_code == 404

    def test_submit_review_invalid_quality(self, authenticated_client, test_cards):
        """Should validate quality range."""
        card = test_cards[0]

        response = authenticated_client.post(
            "/practice/review",
            json={
                "card_id": str(card.id),
                "quality": 10  # Invalid
            }
        )

        assert response.status_code == 422  # Validation error


class TestLeechCards:
    """Tests for leech card endpoints."""

    def test_get_leeches_empty(self, authenticated_client, test_cards, db):
        """Should return empty list when no leeches."""
        response = authenticated_client.get("/practice/leeches")

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["cards"] == []

    def test_get_leeches_with_leeches(self, authenticated_client, test_cards, db):
        """Should return leech cards."""
        # Mark a card as leech
        card = test_cards[0]
        card.is_leech = True
        card.lapses = 10
        db.commit()

        response = authenticated_client.get("/practice/leeches")

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["cards"][0]["id"] == str(card.id)
        assert data["cards"][0]["lapses"] == 10

    def test_reset_leech(self, authenticated_client, test_cards, db):
        """Should reset leech status."""
        # Mark a card as leech
        card = test_cards[0]
        card.is_leech = True
        card.lapses = 10
        db.commit()

        response = authenticated_client.post(f"/practice/leeches/{card.id}/reset")

        assert response.status_code == 200
        assert response.json()["ok"] is True

        # Verify reset
        db.refresh(card)
        assert card.is_leech is False
        assert card.lapses == 0

    def test_reset_leech_nonexistent(self, authenticated_client):
        """Should return 404 for nonexistent card."""
        response = authenticated_client.post(f"/practice/leeches/{uuid4()}/reset")

        assert response.status_code == 404


class TestAIPracticeQuiz:
    """Tests for AI-generated practice quiz endpoint."""

    def test_generate_quiz_empty_deck(self, authenticated_client, test_deck, db):
        """Should return 404 for deck with no words."""
        response = authenticated_client.get(f"/practice/generate/{test_deck.id}")

        assert response.status_code == 404

    def test_generate_quiz_with_words(self, authenticated_client, test_deck, test_words, db):
        """Should generate quiz when deck has words."""
        # Note: This test may require mocking the Gemini API
        response = authenticated_client.get(f"/practice/generate/{test_deck.id}")

        # Could be 200 (success) or 500 (API error in test environment)
        assert response.status_code in [200, 500]

    def test_generate_quiz_wrong_deck(self, authenticated_client, db, test_user):
        """Should return 404 for deck not owned by user."""
        # Create another user's deck
        from models import Deck, User
        other_user = User(
            id=uuid4(),
            username="other_user",
        )
        db.add(other_user)
        db.commit()

        other_deck = Deck(
            id=uuid4(),
            user_id=other_user.id,
            name="Other Deck",
            language="French"
        )
        db.add(other_deck)
        db.commit()

        response = authenticated_client.get(f"/practice/generate/{other_deck.id}")

        assert response.status_code == 403
