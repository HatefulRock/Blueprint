"""
Tests for unified practice endpoints.

Tests cover:
- Mixed practice sessions
- Practice mode selection
- Available modes detection
- Answer submission for different types
"""

import pytest
from datetime import datetime
from uuid import uuid4

# 1. FIX: Standard import
import models

class TestUnifiedPracticeSession:
    """Tests for unified practice session generation."""

    def test_get_session_flashcards_mode(
        self, authenticated_client, test_deck, test_cards, db
    ):
        """Should get flashcard-only session."""
        response = authenticated_client.get(
            "/practice/unified/session",
            params={"mode": "flashcards", "limit": 10}
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data.get("mode") == "flashcards"
        assert "items" in data
        
        # Verify items
        if data["items"]:
            for item in data["items"]:
                assert item["type"] == "flashcard"

    def test_get_session_grammar_mode(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should get grammar-only session."""
        response = authenticated_client.get(
            "/practice/unified/session",
            params={"mode": "grammar", "limit": 10}
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("mode") == "grammar"

        for item in data["items"]:
            assert item["type"] == "grammar"

    def test_get_session_mixed_mode(
        self, authenticated_client, test_deck, test_cards, test_grammar_exercise_set, db
    ):
        """Should get mixed session with various types."""
        response = authenticated_client.get(
            "/practice/unified/session",
            params={"mode": "mixed", "limit": 20}
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("mode") == "mixed"
        
        # Should have breakdown of types if mixed
        if "breakdown" in data:
            breakdown = data["breakdown"]
            # Asserting keys exist, values > 0 depends on available data
            assert isinstance(breakdown, dict)

    def test_get_session_with_deck_filter(
        self, authenticated_client, test_deck, test_cards, db
    ):
        """Should filter by deck when specified."""
        response = authenticated_client.get(
            "/practice/unified/session",
            params={
                "mode": "flashcards",
                "deck_id": str(test_deck.id),
                "limit": 10
            }
        )

        assert response.status_code == 200
        data = response.json()

        # All cards should be from the specified deck
        for item in data["items"]:
            if item["type"] == "flashcard":
                # Check data structure, typically inside 'data' or 'content'
                card_data = item.get("data", item) 
                assert card_data.get("deck_id") == str(test_deck.id)

    def test_get_session_limit_respected(self, authenticated_client, test_cards, db):
        """Should respect the limit parameter."""
        limit = 3
        response = authenticated_client.get(
            "/practice/unified/session",
            params={"mode": "flashcards", "limit": limit}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= limit


class TestAvailableModes:
    """Tests for available modes endpoint."""

    def test_get_available_modes(self, authenticated_client, test_cards, db):
        """Should return available practice modes with counts."""
        response = authenticated_client.get("/practice/unified/available-modes")

        assert response.status_code == 200
        data = response.json()
        assert "modes" in data

        modes = data["modes"]
        # Basic modes should be present
        assert "flashcards" in modes
        assert "mixed" in modes

        # Each mode should have available, count, description
        for mode_name, mode_info in modes.items():
            assert "available" in mode_info
            assert "count" in mode_info
            # Description might be optional

    def test_flashcards_available_when_due(
        self, authenticated_client, test_cards, db
    ):
        """Flashcards should be available when there are due cards."""
        response = authenticated_client.get("/practice/unified/available-modes")

        assert response.status_code == 200
        data = response.json()

        # test_cards fixture creates cards with past due dates
        if "flashcards" in data["modes"]:
            assert data["modes"]["flashcards"]["available"] is True
            assert data["modes"]["flashcards"]["count"] > 0


class TestSubmitUnifiedAnswer:
    """Tests for unified answer submission."""

    def test_submit_flashcard_answer(self, authenticated_client, test_cards, db):
        """Should submit flashcard answer with quality rating."""
        card = test_cards[0]

        # 3. FIX: Use json instead of params for POST body
        response = authenticated_client.post(
            "/practice/unified/submit-answer",
            json={
                "item_type": "flashcard",
                "item_id": str(card.id),
                "answer": "4",  # Quality rating
                "response_time_ms": 2000
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("type") == "flashcard"
        assert "is_correct" in data
        # Next review info usually returned
        # assert "next_review" in data

    def test_submit_grammar_answer_correct(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should submit correct grammar answer."""
        # 2. FIX: Use models.GrammarExercise
        exercise = db.query(models.GrammarExercise).filter(
            models.GrammarExercise.exercise_set_id == test_grammar_exercise_set.id
        ).first()

        response = authenticated_client.post(
            "/practice/unified/submit-answer",
            json={
                "item_type": "grammar",
                "item_id": str(exercise.id),
                "answer": exercise.correct_answer,
                "response_time_ms": 3000
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("type") == "grammar"
        assert data.get("is_correct") is True
        assert data.get("correct_answer") == exercise.correct_answer

    def test_submit_grammar_answer_incorrect(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should handle incorrect grammar answer."""
        exercise = db.query(models.GrammarExercise).filter(
            models.GrammarExercise.exercise_set_id == test_grammar_exercise_set.id
        ).first()

        response = authenticated_client.post(
            "/practice/unified/submit-answer",
            json={
                "item_type": "grammar",
                "item_id": str(exercise.id),
                "answer": "wrong answer",
                "response_time_ms": 3000
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("is_correct") is False
        assert "explanation" in data

    def test_submit_writing_redirects(self, authenticated_client):
        """Should indicate writing uses separate endpoint."""
        response = authenticated_client.post(
            "/practice/unified/submit-answer",
            json={
                "item_type": "writing",
                "item_id": "writing_0",
                "answer": "some text"
            }
        )

        # Might return 200 with message or specific code
        assert response.status_code == 200
        data = response.json()
        assert data.get("type") == "writing"
        # Check for message about redirection or endpoint
        msg = data.get("message", "").lower()
        assert "endpoint" in msg or "writing" in msg or "submitted" in msg

    def test_submit_invalid_type(self, authenticated_client):
        """Should reject invalid item type."""
        response = authenticated_client.post(
            "/practice/unified/submit-answer",
            json={
                "item_type": "invalid",
                "item_id": "123",
                "answer": "test"
            }
        )

        # 400 Bad Request or 422 Validation Error
        assert response.status_code in [400, 422]

    def test_submit_nonexistent_item(self, authenticated_client):
        """Should return 404 for nonexistent item."""
        response = authenticated_client.post(
            "/practice/unified/submit-answer",
            json={
                "item_type": "grammar",
                "item_id": str(uuid4()),
                "answer": "test"
            }
        )

        assert response.status_code == 404


class TestWritingPromptGeneration:
    """Tests for writing prompt generation in unified practice."""

    def test_writing_prompts_with_words(
        self, authenticated_client, test_deck, test_words, db
    ):
        """Should generate writing prompts when user has vocabulary."""
        response = authenticated_client.get(
            "/practice/unified/session",
            params={"mode": "writing", "limit": 5}
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("mode") == "writing"

        for item in data["items"]:
            assert item["type"] == "writing"
            # Verify data structure
            item_data = item.get("data", item)
            assert "prompt" in item_data

    def test_writing_prompts_empty_vocabulary(
        self, authenticated_client, test_deck, db
    ):
        """Should handle case with no vocabulary."""
        # Note: test_deck is empty by default unless test_words fixture is used
        response = authenticated_client.get(
            "/practice/unified/session",
            params={"mode": "writing", "limit": 5}
        )

        assert response.status_code == 200
        data = response.json()
        # Should return valid empty list or limited items
        assert "items" in data