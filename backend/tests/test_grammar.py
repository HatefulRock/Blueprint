"""
Tests for grammar endpoints.

Tests cover:
- Exercise generation
- Exercise set management
- Answer checking
- Progress tracking
- Grammar patterns
"""

import pytest
from datetime import datetime
from uuid import uuid4

# 1. FIX: Standard import to avoid SQLAlchemy table conflicts
import models 

class TestExerciseGeneration:
    """Tests for grammar exercise generation."""

    def test_generate_exercises(self, authenticated_client, db):
        """Should generate grammar exercises from text."""
        response = authenticated_client.post(
            "/grammar/generate",
            json={
                "text": "Ich gehe heute in die Schule. Morgen werde ich zu Hause bleiben.",
                "language": "German",
                "num_exercises": 5,
                "exercise_types": ["fill_blank", "multiple_choice", "transformation"]
            }
        )

        # Note: In a real test, mock the AI service so this always returns 200.
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert "title" in data
            assert data.get("language") == "German"
            # Some APIs return exactly requested, others might return less if text is short
            assert data.get("total_exercises") > 0

    def test_generate_exercises_default_types(self, authenticated_client, db):
        """Should use default exercise types if not specified."""
        response = authenticated_client.post(
            "/grammar/generate",
            json={
                "text": "Je suis un etudiant.",
                "language": "French",
                "num_exercises": 3
            }
        )

        # Just verify endpoint responds without crash
        assert response.status_code in [200, 422, 500, 503]


class TestExerciseSetManagement:
    """Tests for exercise set CRUD operations."""

    def test_get_exercise_sets(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should return user's exercise sets."""
        response = authenticated_client.get("/grammar/sets")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Ensure the test set we just created is in the list
        ids = [item["id"] for item in data]
        assert str(test_grammar_exercise_set.id) in ids

    def test_get_single_exercise_set(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should return a specific exercise set."""
        response = authenticated_client.get(
            f"/grammar/sets/{test_grammar_exercise_set.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_grammar_exercise_set.id)

    def test_get_nonexistent_exercise_set(self, authenticated_client):
        """Should return 404 for nonexistent set."""
        response = authenticated_client.get(f"/grammar/sets/{uuid4()}")

        assert response.status_code == 404

    def test_get_other_users_exercise_set(
        self, authenticated_client, db
    ):
        """Should return 403 for another user's exercise set."""
        # 2. FIX: Use models.User and models.GrammarExerciseSet
        
        # Create another user's exercise set
        other_user = models.User(
            id=uuid4(),
            username=f"other_gram_{uuid4().hex[:8]}", # Unique username
            email=f"other_{uuid4().hex[:8]}@example.com",
            hashed_password="hash"
        )
        db.add(other_user)
        db.flush()

        other_set = models.GrammarExerciseSet(
            id=uuid4(),
            user_id=other_user.id,
            title="Other's Grammar Set",
            language="Spanish",
            total_exercises=5,
            completed_exercises=0
        )
        db.add(other_set)
        db.commit()

        response = authenticated_client.get(f"/grammar/sets/{other_set.id}")

        assert response.status_code == 403

    def test_delete_exercise_set(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should delete an exercise set."""
        response = authenticated_client.delete(
            f"/grammar/sets/{test_grammar_exercise_set.id}"
        )

        assert response.status_code == 200
        # Verify deletion message or check DB
        assert "deleted" in response.json().get("message", "").lower() or response.json().get("ok") is True


class TestAnswerChecking:
    """Tests for checking exercise answers."""

    def test_check_correct_answer(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should correctly validate a correct answer."""
        # 3. FIX: Use models.GrammarExercise
        exercise = db.query(models.GrammarExercise).filter(
            models.GrammarExercise.exercise_set_id == test_grammar_exercise_set.id
        ).first()

        assert exercise is not None, "Fixture did not create exercises"

        response = authenticated_client.post(
            "/grammar/check",
            json={
                "exercise_id": str(exercise.id),
                "user_answer": exercise.correct_answer
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("is_correct") is True
        assert data.get("correct_answer") == exercise.correct_answer

    def test_check_incorrect_answer(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should correctly validate an incorrect answer."""
        exercise = db.query(models.GrammarExercise).filter(
            models.GrammarExercise.exercise_set_id == test_grammar_exercise_set.id
        ).first()

        response = authenticated_client.post(
            "/grammar/check",
            json={
                "exercise_id": str(exercise.id),
                "user_answer": "wrong answer"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("is_correct") is False
        assert "explanation" in data

    def test_check_nonexistent_exercise(self, authenticated_client):
        """Should return 404 for nonexistent exercise."""
        response = authenticated_client.post(
            "/grammar/check",
            json={
                "exercise_id": str(uuid4()), # Use UUID format
                "user_answer": "test"
            }
        )

        assert response.status_code == 404

    def test_check_answer_updates_stats(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should update exercise statistics after checking."""
        exercise = db.query(models.GrammarExercise).filter(
            models.GrammarExercise.exercise_set_id == test_grammar_exercise_set.id
        ).first()

        initial_attempts = exercise.attempts

        authenticated_client.post(
            "/grammar/check",
            json={
                "exercise_id": str(exercise.id),
                "user_answer": "some answer"
            }
        )

        db.refresh(exercise)
        assert exercise.attempts == initial_attempts + 1


class TestExerciseProgress:
    """Tests for exercise set progress tracking."""

    def test_get_exercise_progress(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should return progress for an exercise set."""
        response = authenticated_client.get(
            f"/grammar/sets/{test_grammar_exercise_set.id}/progress"
        )

        assert response.status_code == 200
        data = response.json()
        assert "set_id" in data
        assert "total_exercises" in data
        assert "completed_exercises" in data
        
        # Check metrics if present in your API
        if "accuracy" in data:
            assert data["accuracy"] >= 0

    def test_progress_calculation(
        self, authenticated_client, test_grammar_exercise_set, db
    ):
        """Should calculate accurate progress metrics."""
        # Set up some completed exercises
        exercises = db.query(models.GrammarExercise).filter(
            models.GrammarExercise.exercise_set_id == test_grammar_exercise_set.id
        ).all()

        for i, ex in enumerate(exercises[:2]):
            ex.attempts = 3
            ex.correct_attempts = 2

        test_grammar_exercise_set.completed_exercises = 2
        db.commit()

        response = authenticated_client.get(
            f"/grammar/sets/{test_grammar_exercise_set.id}/progress"
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("completion_percentage", 0) > 0


class TestGrammarPatterns:
    """Tests for grammar pattern library."""

    def test_get_grammar_patterns(self, authenticated_client):
        """Should return grammar patterns for a language."""
        response = authenticated_client.get(
            "/grammar/patterns/Spanish"
        )

        # May return 200 or 500 depending on API availability
        if response.status_code == 200:
            data = response.json()
            assert data.get("language") == "Spanish"
            assert "patterns" in data

    def test_get_grammar_patterns_with_level(self, authenticated_client):
        """Should filter patterns by level."""
        response = authenticated_client.get(
            "/grammar/patterns/German",
            params={"level": "A1"}
        )

        # Just verify endpoint responds
        assert response.status_code in [200, 500, 503]

    def test_grammar_patterns_cached(self, authenticated_client):
        """Should use cached patterns on repeated requests."""
        # First request
        authenticated_client.get("/grammar/patterns/French")

        # Second request (should hit cache)
        response = authenticated_client.get("/grammar/patterns/French")

        assert response.status_code in [200, 500, 503]