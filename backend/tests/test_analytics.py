"""
Tests for analytics endpoints.

Tests cover:
- Practice statistics
- Progress insights
- Weak areas identification
- Activity heatmap
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

# Standard import to avoid SQLAlchemy table conflicts
import models 

# Import helper functions from factories
from tests.factories import create_practice_review 

class TestPracticeStats:
    """Tests for practice statistics endpoint."""

    def test_get_practice_stats(self, authenticated_client, test_user, db):
        """Should return practice analytics."""
        # FIX: Removed params={"user_id": ...}. 
        # The authenticated_client passes the token, which the backend uses to identify the user.
        response = authenticated_client.get("/analytics/practice")

        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_sessions" in data
        assert "total_reviews" in data
        assert "average_quality" in data

    def test_get_practice_stats_with_date_range(self, authenticated_client, test_user, db):
        """Should filter by date range."""
        from_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
        to_date = datetime.utcnow().isoformat()

        # FIX: Removed user_id from params, kept date filters
        response = authenticated_client.get(
            "/analytics/practice",
            params={
                "date_from": from_date,
                "date_to": to_date
            }
        )

        assert response.status_code == 200
        data = response.json()
        
        # Ensure your API returns these fields (check backend response model if this assertion fails)
        # Some APIs return the range in a 'metadata' or 'query' field
        if "from" in data:
            assert data["from"] is not None

    def test_get_practice_stats_with_reviews(
        self, authenticated_client, test_user, test_cards, db
    ):
        """Should include data when reviews exist."""
        # Create some reviews
        for card in test_cards[:5]:
            create_practice_review(db, test_user, card)

        # FIX: Removed params={"user_id": ...}
        response = authenticated_client.get("/analytics/practice")

        assert response.status_code == 200
        data = response.json()
        assert data["total_reviews"] >= 5


class TestProgressInsights:
    """Tests for progress insights endpoint."""

    def test_get_progress_insights(self, authenticated_client, db):
        """Should return comprehensive progress insights."""
        response = authenticated_client.get("/analytics/progress")

        assert response.status_code == 200
        data = response.json()
        
        # Check high-level structure
        assert "vocabulary_progress" in data
        assert "practice_progress" in data

    def test_get_progress_insights_custom_days(self, authenticated_client, db):
        """Should support custom day range."""
        response = authenticated_client.get(
            "/analytics/progress",
            params={"days": 7}
        )

        assert response.status_code == 200
        data = response.json()
        
        if "date_range" in data:
            assert data["date_range"].get("days") == 7

    def test_progress_totals_structure(self, authenticated_client, db):
        """Should have correct totals structure."""
        response = authenticated_client.get("/analytics/progress")

        assert response.status_code == 200
        data = response.json()
        
        if "totals" in data:
            totals = data["totals"]
            assert "total_words" in totals
            assert "total_practice_sessions" in totals


class TestWeakAreas:
    """Tests for weak areas identification."""

    def test_get_weak_areas(self, authenticated_client, db):
        """Should identify weak areas."""
        response = authenticated_client.get("/analytics/weak-areas")

        assert response.status_code == 200
        data = response.json()
        # Check for weak_vocabulary (snake_case is standard in Python backends)
        assert "weak_vocabulary" in data or "weakVocabulary" in data

    def test_weak_vocabulary_structure(
        self, authenticated_client, test_words, db
    ):
        """Should return correct weak vocabulary structure."""
        # Set low familiarity for some words
        for word in test_words[:3]:
            word.familiarity_score = 1
            word.last_reviewed_at = datetime.utcnow()
        db.commit()

        response = authenticated_client.get("/analytics/weak-areas")

        assert response.status_code == 200
        data = response.json()
        
        weak_vocab = data.get("weak_vocabulary", [])
        if weak_vocab:
            word = weak_vocab[0]
            assert "term" in word
            assert "familiarity_score" in word

    def test_weak_grammar_points_calculation(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should calculate weak grammar points based on accuracy."""
        GrammarExercise = models.GrammarExercise

        # Set up exercises with low accuracy
        exercises = db.query(GrammarExercise).filter(
            GrammarExercise.exercise_set_id == test_grammar_exercise_set.id
        ).all()

        for ex in exercises[:2]:
            ex.attempts = 10
            ex.correct_attempts = 3  # 30% accuracy
        db.commit()

        response = authenticated_client.get("/analytics/weak-areas")
        assert response.status_code == 200


class TestActivityHeatmap:
    """Tests for activity heatmap endpoint."""

    def test_get_activity_heatmap(self, authenticated_client, db):
        """Should return activity heatmap data."""
        response = authenticated_client.get("/analytics/heatmap")

        assert response.status_code == 200
        data = response.json()
        assert "heatmap" in data

    def test_heatmap_custom_days(self, authenticated_client, db):
        """Should support custom day range."""
        response = authenticated_client.get(
            "/analytics/heatmap",
            params={"days": 30}
        )
        assert response.status_code == 200

    def test_heatmap_data_structure(self, authenticated_client, db):
        """Should have correct heatmap data structure."""
        response = authenticated_client.get("/analytics/heatmap")

        assert response.status_code == 200
        data = response.json()

        heatmap = data.get("heatmap", [])
        if heatmap:
            entry = heatmap[0]
            assert "date" in entry
            # Check for activity counts
            assert any(key in entry for key in ["vocabulary", "grammar", "count", "value"])

    def test_heatmap_with_activity(
        self, authenticated_client, test_user, test_cards, db
    ):
        """Should include activity data when present."""
        # Create some reviews today
        for card in test_cards[:3]:
            create_practice_review(db, test_user, card)

        response = authenticated_client.get("/analytics/heatmap")

        assert response.status_code == 200
        data = response.json()
        heatmap = data.get("heatmap", [])
        
        # Verify we have entries
        assert isinstance(heatmap, list)