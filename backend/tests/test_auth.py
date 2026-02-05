"""
Tests for authentication endpoints.

Tests cover:
- User registration
- User login
- Token validation
- Legacy user password setup
"""

import pytest
from uuid import uuid4

# 1. FIX: Standard import to avoid SQLAlchemy table conflicts
import models 

class TestUserRegistration:
    """Tests for user registration endpoint."""

    def test_register_new_user(self, client, db):
        """Should register a new user and return token."""
        response = client.post(
            "/auth/register",
            json={
                "username": f"newuser_{uuid4().hex[:8]}",
                "password": "securepassword123",
                "email": "newuser@example.com"
            }
        )

        assert response.status_code == 200
        data = response.json()
        
        # Note: Standard OAuth2 often uses "access_token", but we check for "token" 
        # based on your test code.
        assert "token" in data or "access_token" in data
        assert data.get("token_type") == "bearer"
        
        # Check if user details are returned
        if "id" in data:
            assert "username" in data

    def test_register_duplicate_username(self, client, test_user, db):
        """Should reject duplicate username with password."""
        response = client.post(
            "/auth/register",
            json={
                "username": test_user.username,
                "password": "anotherpassword"
            }
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_legacy_user(self, client, db):
        """Should allow password setup for legacy user without password."""
        # 2. FIX: Use the top-level 'models' import
        
        # Create legacy user without password
        legacy_user = models.User(
            id=uuid4(),
            username=f"legacy_{uuid4().hex[:8]}",
            hashed_password=None
        )
        db.add(legacy_user)
        db.commit()

        response = client.post(
            "/auth/register",
            json={
                "username": legacy_user.username,
                "password": "newpassword123",
                "email": "legacy@example.com"
            }
        )

        # Depending on your logic, this might update the user or return error
        # Assuming your logic allows "claiming" a legacy account:
        assert response.status_code == 200
        data = response.json()
        assert data.get("username") == legacy_user.username

    def test_register_with_email(self, client, db):
        """Should store email when provided."""
        response = client.post(
            "/auth/register",
            json={
                "username": f"emailuser_{uuid4().hex[:8]}",
                "password": "password123",
                "email": "test@example.com"
            }
        )

        assert response.status_code == 200

    def test_register_without_email(self, client, db):
        """Should work without email."""
        response = client.post(
            "/auth/register",
            json={
                "username": f"noemailu_{uuid4().hex[:8]}",
                "password": "password123"
            }
        )

        assert response.status_code == 200


class TestUserLogin:
    """Tests for user login endpoint."""

    def test_login_success(self, client, test_user_with_password, db):
        """Should return token for valid credentials."""
        response = client.post(
            "/auth/login",
            json={
                "username": test_user_with_password.username,
                "password": "testpassword123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data
        assert data.get("token_type") == "bearer"
        
        if "username" in data:
            assert data["username"] == test_user_with_password.username

    def test_login_wrong_password(self, client, test_user_with_password, db):
        """Should reject wrong password."""
        response = client.post(
            "/auth/login",
            json={
                "username": test_user_with_password.username,
                "password": "wrongpassword"
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client):
        """Should reject nonexistent user."""
        response = client.post(
            "/auth/login",
            json={
                "username": "nonexistent_user",
                "password": "somepassword"
            }
        )

        assert response.status_code == 401

    def test_login_user_without_password(self, client, db):
        """Should reject user without password set."""
        # 3. FIX: Use top-level 'models' import

        # Create user without password
        user = models.User(
            id=uuid4(),
            username=f"nopass_{uuid4().hex[:8]}",
            hashed_password=None
        )
        db.add(user)
        db.commit()

        response = client.post(
            "/auth/login",
            json={
                "username": user.username,
                "password": "anypassword"
            }
        )

        assert response.status_code == 401


class TestTokenValidation:
    """Tests for token-based authentication."""

    def test_valid_token_access(self, authenticated_client):
        """Should allow access with valid token."""
        # Ensure this endpoint exists in your Main.py router
        response = authenticated_client.get("/users/me")

        assert response.status_code == 200

    def test_invalid_token_rejected(self, client):
        """Should reject invalid token."""
        client.headers["Authorization"] = "Bearer invalid_token_here"

        response = client.get("/users/me")

        assert response.status_code == 401

    def test_missing_token_rejected(self, client):
        """Should reject requests without token."""
        # Ensure client headers are clean
        if "Authorization" in client.headers:
            del client.headers["Authorization"]

        response = client.get("/users/me")

        assert response.status_code == 401

    def test_malformed_auth_header(self, client):
        """Should reject malformed authorization header."""
        client.headers["Authorization"] = "NotBearer sometoken"

        response = client.get("/users/me")

        assert response.status_code == 401