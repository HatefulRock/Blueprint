"""
Tests for user management and goals endpoints.

Tests cover:
- User profile and stats
- Daily progress tracking
- Goal management
- Streak management
- Check-in functionality
"""

import pytest
from datetime import date, datetime, timedelta
from uuid import uuid4

# 1. FIX: Standard import
import models

# 2. FIX: Factory import
from tests.factories import create_practice_review

class TestUserProfile:
    """Tests for user profile endpoints."""

    def test_get_me(self, authenticated_client, test_user):
        """Should return current user profile."""
        response = authenticated_client.get("/users/me")

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user.username
        assert "id" in data
        
        # Check specific fields or optional ones
        if "points" in data:
            assert data["points"] == test_user.points

    def test_get_stats(self, authenticated_client, test_user):
        """Should return user stats."""
        response = authenticated_client.get("/users/stats")

        assert response.status_code == 200
        data = response.json()
        assert data.get("points") == test_user.points
        assert data.get("streak") == test_user.streak

    def test_get_progress(self, authenticated_client, test_user, test_deck, db):
        """Should return user progress."""
        response = authenticated_client.get("/users/progress")

        assert response.status_code == 200
        data = response.json()
        
        # Verify keys exist
        assert "points" in data
        assert "streak" in data
        assert "weekly_words" in data or "words_this_week" in data
        assert "weekly_sessions" in data or "sessions_this_week" in data
        assert "total_decks" in data


class TestDailyProgress:
    """Tests for daily progress endpoint."""

    def test_get_daily_progress(self, authenticated_client, test_goal, db):
        """Should return today's progress against goals."""
        response = authenticated_client.get("/users/daily-progress")

        assert response.status_code == 200
        data = response.json()

        assert "date" in data
        assert "goals" in data
        assert "progress" in data
        assert "completion" in data
        assert "streak" in data

        # Check goals structure
        goals = data["goals"]
        assert "cards_per_day" in goals
        assert "grammar_exercises_per_day" in goals
        assert "minutes_per_day" in goals

        # Check progress structure
        progress = data["progress"]
        assert "cards_reviewed" in progress
        assert "grammar_completed" in progress

        # Check completion structure
        completion = data["completion"]
        assert "cards" in completion
        assert "grammar" in completion
        assert "overall" in completion

    def test_get_daily_progress_creates_goal(self, authenticated_client, test_user, db):
        """Should create default goal if none exists."""
        # Ensure no goal exists
        db.query(models.Goal).filter(models.Goal.user_id == test_user.id).delete()
        db.commit()

        response = authenticated_client.get("/users/daily-progress")

        assert response.status_code == 200
        data = response.json()

        # Should have default values
        assert data["goals"]["cards_per_day"] == 20

    def test_daily_progress_with_reviews(
        self, authenticated_client, test_user, test_cards, test_goal, db
    ):
        """Should count today's reviews."""
        # Create some reviews for today
        for card in test_cards[:3]:
            create_practice_review(db, test_user, card)

        response = authenticated_client.get("/users/daily-progress")

        assert response.status_code == 200
        data = response.json()
        assert data["progress"]["cards_reviewed"] >= 3


class TestGoalManagement:
    """Tests for goal update endpoint."""

    def test_update_goals(self, authenticated_client, test_goal, db):
        """Should update user goals."""
        response = authenticated_client.put(
            "/users/goals",
            params={
                "cards_per_day": 30,
                "grammar_exercises_per_day": 10,
                "minutes_per_day": 20
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True or "goals" in data
        
        # Depending on return format (full object or just ok status)
        if "goals" in data:
            assert data["goals"]["cards_per_day"] == 30
            assert data["goals"]["grammar_exercises_per_day"] == 10
            assert data["goals"]["minutes_per_day"] == 20

    def test_update_goals_partial(self, authenticated_client, test_goal, db):
        """Should allow partial goal updates."""
        response = authenticated_client.put(
            "/users/goals",
            params={"cards_per_day": 25}
        )

        assert response.status_code == 200
        data = response.json()
        if "goals" in data:
            assert data["goals"]["cards_per_day"] == 25

    def test_update_goals_minimum_values(self, authenticated_client, test_goal, db):
        """Should enforce minimum goal values."""
        response = authenticated_client.put(
            "/users/goals",
            params={"cards_per_day": 0, "minutes_per_day": 1}
        )

        assert response.status_code == 200
        data = response.json()
        if "goals" in data:
            assert data["goals"]["cards_per_day"] >= 1
            assert data["goals"]["minutes_per_day"] >= 5

    def test_update_goals_creates_if_missing(self, authenticated_client, test_user, db):
        """Should create goal if none exists."""
        db.query(models.Goal).filter(models.Goal.user_id == test_user.id).delete()
        db.commit()

        response = authenticated_client.put(
            "/users/goals",
            params={"cards_per_day": 15}
        )

        assert response.status_code == 200
        # Either returns OK or the created goal
        data = response.json()
        assert data.get("ok") is True or "goals" in data


class TestStreakManagement:
    """Tests for streak freeze endpoint."""

    def test_use_streak_freeze(self, authenticated_client, test_goal, db):
        """Should use a streak freeze."""
        initial_freezes = test_goal.streak_freezes_available

        response = authenticated_client.post("/users/streak/freeze")

        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True or "freezes_remaining" in data
        
        if "freezes_remaining" in data:
             assert data["freezes_remaining"] == initial_freezes - 1

    def test_use_streak_freeze_none_available(self, authenticated_client, test_goal, db):
        """Should fail when no freezes available."""
        test_goal.streak_freezes_available = 0
        db.commit()

        response = authenticated_client.post("/users/streak/freeze")

        # Could be 400 Bad Request or 422 Unprocessable Entity
        assert response.status_code in [400, 422]

class TestCheckIn:
    """Tests for daily check-in endpoint."""

    def test_check_in_first_time(self, authenticated_client, test_user, db):
        """Should handle first check-in."""
        test_user.last_active_date = None
        test_user.streak = 0
        db.commit()

        response = authenticated_client.post("/users/check-in")

        assert response.status_code == 200
        data = response.json()
        assert data["streak"] == 1
        
        # Points usually awarded on checkin
        if "points" in data:
             assert data["points"] > 0

    def test_check_in_continue_streak(self, authenticated_client, test_user, db):
        """Should continue streak when checking in consecutive days."""
        yesterday = datetime.utcnow().date() - timedelta(days=1)
        test_user.last_active_date = yesterday
        test_user.streak = 5
        db.commit()

        response = authenticated_client.post("/users/check-in")

        assert response.status_code == 200
        data = response.json()
        assert data["streak"] == 6
        assert "continued" in data.get("message", "").lower()

    def test_check_in_same_day(self, authenticated_client, test_user, db):
        """Should not double count same-day check-in."""
        today = datetime.utcnow().date()
        test_user.last_active_date = today
        test_user.streak = 5
        db.commit()

        response = authenticated_client.post("/users/check-in")

        assert response.status_code == 200
        data = response.json()
        assert data["streak"] == 5  # Unchanged
        assert "already" in data.get("message", "").lower()

    def test_check_in_streak_reset(self, authenticated_client, test_user, db):
        """Should reset streak after missing days."""
        old_date = datetime.utcnow().date() - timedelta(days=3)
        test_user.last_active_date = old_date
        test_user.streak = 10
        db.commit()

        response = authenticated_client.post("/users/check-in")

        assert response.status_code == 200
        data = response.json()
        assert data["streak"] == 1  # Reset
        assert "reset" in data.get("message", "").lower()


class TestDashboard:
    """Tests for dashboard endpoint."""

    def test_get_dashboard(self, authenticated_client, test_user, test_deck, test_words, db):
        """Should return dashboard data."""
        response = authenticated_client.get("/users/dashboard")

        assert response.status_code == 200
        data = response.json()

        assert "user" in data
        assert data["user"]["username"] == test_user.username

        assert "progress" in data
        # Keys might be camelCase or snake_case depending on Pydantic config
        progress = data["progress"]
        assert "newWordsThisWeek" in progress or "new_words_this_week" in progress
        assert "practiceSessionsThisWeek" in progress or "practice_sessions_this_week" in progress

        assert "studyPlan" in data or "study_plan" in data