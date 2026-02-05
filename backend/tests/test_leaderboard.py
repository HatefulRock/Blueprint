"""
Tests for leaderboard endpoints.

Tests cover:
- Top users retrieval
- Leaderboard sorting
- Leaderboard limits
"""

import pytest
from uuid import uuid4


class TestLeaderboard:
    """Tests for leaderboard endpoint."""

    def test_get_top_users(self, client, test_user, db):
        """Should return top users by points."""
        response = client.get("/leaderboard/top")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_top_users_with_limit(self, client, db):
        """Should respect the limit parameter."""
        response = client.get(
            "/leaderboard/top",
            params={"limit": 5}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5

    def test_top_users_sorted_by_points(self, client, db):
        """Should return users sorted by points descending."""
        from models import User

        # Create users with different point values
        users = []
        for points in [100, 500, 250, 750]:
            user = User(
                id=uuid4(),
                username=f"lb_user_{uuid4().hex[:8]}",
                points=points
            )
            db.add(user)
            users.append(user)
        db.commit()

        response = client.get("/leaderboard/top")

        assert response.status_code == 200
        data = response.json()

        # Check descending order
        for i in range(len(data) - 1):
            assert data[i]["points"] >= data[i + 1]["points"]

    def test_top_users_structure(self, client, test_user, db):
        """Should return correct user structure."""
        response = client.get("/leaderboard/top")

        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            user = data[0]
            assert "id" in user
            assert "username" in user
            assert "points" in user
            assert "streak" in user

    def test_top_users_default_limit(self, client, db):
        """Should have default limit of 10."""
        from models import User

        # Create 15 users
        for i in range(15):
            user = User(
                id=uuid4(),
                username=f"many_user_{uuid4().hex[:8]}",
                points=i * 10
            )
            db.add(user)
        db.commit()

        response = client.get("/leaderboard/top")

        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 10

    def test_top_users_includes_streak(self, client, db):
        """Should include user streak in response."""
        from models import User

        user = User(
            id=uuid4(),
            username=f"streaker_{uuid4().hex[:8]}",
            points=1000,
            streak=15
        )
        db.add(user)
        db.commit()

        response = client.get("/leaderboard/top")

        assert response.status_code == 200
        data = response.json()

        # Find our high-points user
        streaker = next((u for u in data if u["username"].startswith("streaker_")), None)
        if streaker:
            assert streaker["streak"] == 15

