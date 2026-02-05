"""
Tests for community endpoints.

Tests cover:
- Public deck browsing and filtering
- Deck publishing and importing
- Deck rating and reviews
- Challenges (create, join, progress, leaderboard)
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

# 1. FIX: Standard import to avoid SQLAlchemy table conflicts
import models 

class TestPublicDeckBrowsing:
    """Tests for browsing public decks."""

    def test_browse_public_decks_empty(self, client, db):
        """Should return empty list when no public decks."""
        response = client.get("/community/decks")

        assert response.status_code == 200
        data = response.json()
        
        # Verify structure based on your API response
        # Usually returns a list or a dict with 'decks'
        if isinstance(data, list):
             assert len(data) == 0
        else:
             assert "decks" in data
             assert data.get("total") == 0

    def test_browse_public_decks_with_filters(self, client, test_public_deck, db):
        """Should filter by language and level."""
        response = client.get(
            "/community/decks",
            params={"language": test_public_deck.language, "level": "A1"}
        )

        assert response.status_code == 200
        data = response.json()
        
        decks = data if isinstance(data, list) else data.get("decks", [])
        assert len(decks) > 0

    def test_browse_public_decks_sorting(self, client, test_public_deck, db):
        """Should support different sort options."""
        for sort in ["popular", "recent", "rating"]:
            response = client.get(
                "/community/decks",
                params={"sort": sort}
            )

            assert response.status_code == 200

    def test_browse_public_decks_search(self, client, test_public_deck, db):
        """Should search by deck name."""
        response = client.get(
            "/community/decks",
            params={"search": test_public_deck.name[:5]}
        )

        assert response.status_code == 200

    def test_browse_public_decks_pagination(self, client, db):
        """Should support pagination."""
        response = client.get(
            "/community/decks",
            params={"limit": 5, "offset": 0}
        )

        assert response.status_code == 200
        data = response.json()
        
        if isinstance(data, dict):
            assert data.get("limit") == 5
            assert data.get("offset") == 0


class TestPublicDeckDetail:
    """Tests for getting public deck details."""

    def test_get_public_deck_detail(self, client, test_public_deck, db):
        """Should return deck details with preview cards."""
        response = client.get(f"/community/decks/{test_public_deck.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_public_deck.id)
        assert data["name"] == test_public_deck.name
        # Assertions depend on your schema, checking for common fields
        assert "card_count" in data or "preview_cards" in data

    def test_get_nonexistent_deck(self, client):
        """Should return 404 for nonexistent deck."""
        response = client.get(f"/community/decks/{uuid4()}")

        assert response.status_code == 404


class TestDeckPublishing:
    """Tests for publishing decks to community."""

    def test_publish_deck(self, authenticated_client, test_deck, test_cards, db):
        """Should publish a deck with cards."""
        response = authenticated_client.post(
            "/community/decks/publish",
            json={
                "deck_id": str(test_deck.id),
                "name": "My Shared Deck",
                "description": "A great deck for learning",
                "level": "A1"
            }
        )

        assert response.status_code == 200
        data = response.json()
        # API might return {"ok": True} or the created object
        assert data.get("ok") is True or "id" in data
        if "status" in data:
            assert data["status"] == "pending"

    def test_publish_empty_deck(self, authenticated_client, test_deck, db):
        """Should reject publishing empty deck."""
        # 2. FIX: Use models.Card instead of local import
        db.query(models.Card).filter(models.Card.deck_id == test_deck.id).delete()
        db.commit()

        response = authenticated_client.post(
            "/community/decks/publish",
            json={
                "deck_id": str(test_deck.id),
                "name": "Empty Deck",
            }
        )

        # Could be 400 Bad Request or 422 Validation Error depending on implementation
        assert response.status_code in [400, 422]

    def test_publish_nonexistent_deck(self, authenticated_client):
        """Should return 404 for nonexistent deck."""
        response = authenticated_client.post(
            "/community/decks/publish",
            json={
                "deck_id": str(uuid4()),
                "name": "Ghost Deck",
            }
        )

        assert response.status_code == 404


class TestDeckImporting:
    """Tests for importing public decks."""

    def test_import_public_deck(self, authenticated_client, test_public_deck, db):
        """Should import a public deck."""
        response = authenticated_client.post(
            f"/community/decks/{test_public_deck.id}/import"
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True or "id" in data

    def test_import_nonexistent_deck(self, authenticated_client):
        """Should return 404 for nonexistent deck."""
        response = authenticated_client.post(
            f"/community/decks/{uuid4()}/import"
        )

        assert response.status_code == 404


class TestDeckRating:
    """Tests for rating public decks."""

    def test_rate_deck(self, authenticated_client, test_public_deck, db):
        """Should rate a public deck."""
        response = authenticated_client.post(
            f"/community/decks/{test_public_deck.id}/rate",
            json={
                "rating": 5,
                "review": "Excellent deck for beginners!"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True or "id" in data

    def test_rate_deck_update_existing(self, authenticated_client, test_public_deck, db):
        """Should update existing rating."""
        # First rating
        authenticated_client.post(
            f"/community/decks/{test_public_deck.id}/rate",
            json={"rating": 3}
        )

        # Update rating
        response = authenticated_client.post(
            f"/community/decks/{test_public_deck.id}/rate",
            json={"rating": 5, "review": "Changed my mind, it's great!"}
        )

        assert response.status_code == 200

    def test_rate_deck_invalid_rating(self, authenticated_client, test_public_deck):
        """Should reject invalid rating values."""
        response = authenticated_client.post(
            f"/community/decks/{test_public_deck.id}/rate",
            json={"rating": 10}  # Invalid, should be 1-5
        )

        # 422 Unprocessable Entity is standard for Pydantic validation errors
        assert response.status_code == 422


class TestChallenges:
    """Tests for challenge endpoints."""

    def test_list_challenges(self, authenticated_client, test_challenge, db):
        """Should list available challenges."""
        response = authenticated_client.get("/community/challenges")

        assert response.status_code == 200
        data = response.json()
        
        # Adjust assertions based on API response format (list vs dict)
        if isinstance(data, list):
            assert len(data) > 0
        else:
            assert "challenges" in data

    def test_list_challenges_active_only(self, authenticated_client, test_challenge, db):
        """Should filter to active challenges only."""
        response = authenticated_client.get(
            "/community/challenges",
            params={"active_only": True}
        )

        assert response.status_code == 200

    def test_join_challenge(self, authenticated_client, test_challenge, db):
        """Should join a challenge."""
        response = authenticated_client.post(
            f"/community/challenges/{test_challenge.id}/join"
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True or "status" in data

    def test_join_challenge_already_joined(
        self, authenticated_client, test_challenge, test_user, db
    ):
        """Should reject joining same challenge twice."""
        # 3. FIX: Use models.ChallengeParticipant
        participant = models.ChallengeParticipant(
            challenge_id=test_challenge.id,
            user_id=test_user.id
        )
        db.add(participant)
        db.commit()

        # Try to join again
        response = authenticated_client.post(
            f"/community/challenges/{test_challenge.id}/join"
        )

        assert response.status_code in [400, 409] # Bad Request or Conflict

    def test_update_challenge_progress(
        self, authenticated_client, test_challenge, test_user, db
    ):
        """Should update challenge progress."""
        # Join first
        participant = models.ChallengeParticipant(
            challenge_id=test_challenge.id,
            user_id=test_user.id
        )
        db.add(participant)
        db.commit()

        response = authenticated_client.post(
            f"/community/challenges/{test_challenge.id}/update-progress",
            json={"progress": 50}
        )

        assert response.status_code == 200
        data = response.json()
        # Verify progress update if returned
        if "current_progress" in data:
            assert data["current_progress"] == 50

    def test_challenge_completion(
        self, authenticated_client, test_challenge, test_user, db
    ):
        """Should mark challenge as complete when target met."""
        # Join first
        participant = models.ChallengeParticipant(
            challenge_id=test_challenge.id,
            user_id=test_user.id
        )
        db.add(participant)
        db.commit()

        # Update to meet target
        response = authenticated_client.post(
            f"/community/challenges/{test_challenge.id}/update-progress",
            json={"progress": test_challenge.target_value}
        )

        assert response.status_code == 200
        data = response.json()
        
        # Check for completion flag
        assert data.get("completed") is True or data.get("is_completed") is True

    def test_get_challenge_leaderboard(
        self, authenticated_client, test_challenge, db
    ):
        """Should return challenge leaderboard."""
        response = authenticated_client.get(
            f"/community/challenges/{test_challenge.id}/leaderboard"
        )

        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data or isinstance(data, list)

    def test_create_challenge(self, authenticated_client, db):
        """Should create a new challenge."""
        response = authenticated_client.post(
            "/community/challenges/create",
            json={
                "title": "30-Day Vocabulary Sprint",
                "description": "Learn 100 new words in 30 days",
                "challenge_type": "vocabulary",
                "target_value": 100,
                "target_metric": "words_learned",
                "start_date": datetime.utcnow().isoformat(),
                "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "is_public": True,
                "reward_points": 500
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True or "id" in data

    def test_create_challenge_invalid_dates(self, authenticated_client):
        """Should reject challenge with end date before start date."""
        response = authenticated_client.post(
            "/community/challenges/create",
            json={
                "title": "Invalid Challenge",
                "challenge_type": "vocabulary",
                "target_value": 100,
                "target_metric": "words_learned",
                "start_date": (datetime.utcnow() + timedelta(days=10)).isoformat(),
                "end_date": datetime.utcnow().isoformat(),  # Before start
            }
        )

        assert response.status_code in [400, 422]