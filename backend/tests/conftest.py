"""
Shared test fixtures and configuration for Blueprint backend tests.

This module provides:
- Test database setup with SQLite in-memory
- Test client with FastAPI TestClient
- Authenticated user fixtures
- Common test data factories
"""

import os
import sys
import pytest
from datetime import datetime, timedelta
from typing import Generator
from uuid import uuid4

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from services.database import Base, get_db
from main import app
import models

@compiles(JSONB, 'sqlite')
def compile_jsonb_sqlite(type_, compiler, **kw):
    """Compile JSONB as generic JSON for SQLite tests."""
    return "JSON"


# Test database URL - use SQLite in-memory for fast tests
TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine with check_same_thread=False for SQLite
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db() -> Generator[Session, None, None]:
    """Override database dependency for tests."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the database dependency
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all tables at the start of the test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Get a test database session."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def client() -> TestClient:
    """Get a test client."""
    return TestClient(app)


@pytest.fixture
def test_user(db: Session) -> models.User:
    """Create a test user."""
    user = models.User(
        id=uuid4(),
        username=f"testuser_{uuid4().hex[:8]}",
        email=f"test_{uuid4().hex[:8]}@example.com",
        hashed_password="hashed_password_placeholder",
        points=100,
        streak=5,
        new_words_this_week=10,
        practice_sessions_this_week=3,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def authenticated_client(client: TestClient, test_user: models.User, db: Session) -> TestClient:
    """
    Get an authenticated test client.

    Note: This overrides the auth dependency to return our test user.
    In a real test environment, you would create a proper JWT token.
    """
    from services.auth import get_current_user


    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    yield client
    # Clean up override
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]


@pytest.fixture
def test_deck(db: Session, test_user: models.User) -> models.Deck:
    """Create a test deck."""
    deck = models.Deck(
        id=uuid4(),
        user_id=test_user.id,
        name="Test Deck",
        language="Spanish",
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


@pytest.fixture
def test_cards(db: Session, test_deck: models.Deck) -> list:
    """Create test cards in a deck."""
    cards = []
    for i in range(5):
        card = models.Card(
            id=uuid4(),
            deck_id=test_deck.id,
            front=f"Front {i}",
            back=f"Back {i}",
            repetition=0,
            easiness_factor=2.5,
            interval=0,
            next_review_date=datetime.utcnow() - timedelta(days=1),  # Due for review
            lapses=0,
            is_leech=False,
            total_reviews=0,
        )
        db.add(card)
        cards.append(card)
    db.commit()
    for card in cards:
        db.refresh(card)
    return cards


@pytest.fixture
def test_words(db: Session, test_deck: models.Deck) -> list:
    """Create test words in a deck."""
    words = []
    test_terms = ["hola", "adiós", "gracias", "por favor", "buenos días"]
    for i, term in enumerate(test_terms):
        word = models.Word(
            id=uuid4(),
            deck_id=test_deck.id,
            term=term,
            translation=f"translation_{i}",
            context=f"Context for {term}",
            familiarity_score=i % 5,
            next_review_date=datetime.utcnow() - timedelta(days=1),
        )
        db.add(word)
        words.append(word)
    db.commit()
    for word in words:
        db.refresh(word)
    return words


@pytest.fixture
def test_grammar_exercise_set(db: Session, test_user: models.User) -> models.GrammarExerciseSet:
    """Create a test grammar exercise set with exercises."""
    exercise_set = models.GrammarExerciseSet(
        id=uuid4(),
        user_id=test_user.id,
        title="Test Grammar Set",
        language="Spanish",
        difficulty_level="B1",
        total_exercises=3,
        completed_exercises=0,
    )
    db.add(exercise_set)
    db.commit()
    db.refresh(exercise_set)

    # Add exercises
    exercises = []
    for i in range(3):
        exercise = models.GrammarExercise(
            id=uuid4(),
            exercise_set_id=exercise_set.id,
            exercise_type="fill_blank",
            question=f"Complete: El gato ___ en la mesa. (estar)",
            correct_answer="está",
            explanation="Use 'está' for temporary states/locations",
            grammar_point="ser vs estar",
            attempts=0,
            correct_attempts=0,
        )
        db.add(exercise)
        exercises.append(exercise)
    db.commit()

    return exercise_set


@pytest.fixture
def test_goal(db: Session, test_user: models.User) -> models.Goal:
    """Create a test goal for a user."""
    goal = models.Goal(
        id=uuid4(),
        user_id=test_user.id,
        words_per_week=20,
        practice_sessions_per_week=3,
        cards_per_day=20,
        minutes_per_day=15,
        grammar_exercises_per_day=5,
        current_streak=5,
        longest_streak=10,
        streak_freezes_available=2,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@pytest.fixture
def test_user_profile(db: Session, test_user: models.User) -> models.UserProfile:
    """Create a test user profile."""
    profile = models.UserProfile(
        id=uuid4(),
        user_id=test_user.id,
        estimated_level="B1",
        placement_completed_at=datetime.utcnow(),
        placement_score=12,
        placement_language="Spanish",
        daily_goal_minutes=15,
        daily_goal_cards=20,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@pytest.fixture
def test_public_deck(db: Session, test_user: models.User, test_deck: models.Deck) -> models.PublicDeck:
    """Create a test public deck."""
    public_deck = models.PublicDeck(
        id=uuid4(),
        original_deck_id=test_deck.id,
        creator_id=test_user.id,
        name="Shared Spanish Basics",
        description="Basic Spanish vocabulary for beginners",
        language="Spanish",
        level="A1",
        card_count=50,
        word_count=50,
        status="approved",
        downloads=10,
        rating_sum=40,
        rating_count=10,
    )
    db.add(public_deck)
    db.commit()
    db.refresh(public_deck)
    return public_deck


@pytest.fixture
def test_challenge(db: Session, test_user: models.User) -> models.Challenge:
    """Create a test challenge."""
    challenge = models.Challenge(
        id=uuid4(),
        creator_id=test_user.id,
        title="7-Day Review Streak",
        description="Review cards every day for a week",
        challenge_type="streak",
        target_value=7,
        target_metric="streak_days",
        start_date=datetime.utcnow() - timedelta(days=1),
        end_date=datetime.utcnow() + timedelta(days=7),
        is_public=True,
        reward_points=100,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


@pytest.fixture
def test_user_with_password(db: Session) -> models.User:
    """Create a test user with a proper hashed password."""
    from services.auth import get_password_hash

    user = models.User(
        id=uuid4(),
        username=f"authuser_{uuid4().hex[:8]}",
        email=f"auth_{uuid4().hex[:8]}@example.com",
        hashed_password=get_password_hash("testpassword123"),
        points=50,
        streak=3,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_writing_submission(db: Session, test_user: models.User) -> models.WritingSubmission:
    """Create a test writing submission."""
    submission = models.WritingSubmission(
        id=uuid4(),
        user_id=test_user.id,
        title="My Test Essay",
        content="This is the content of my test essay. It has multiple sentences for testing.",
        prompt="Write about your day",
        word_count=15,
        language="English",
        submission_type="essay",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@pytest.fixture
def test_deck_rating(db: Session, test_user: models.User, test_public_deck) -> models.DeckRating:
    """Create a test deck rating."""
    rating = models.DeckRating(
        id=uuid4(),
        deck_id=test_public_deck.id,
        user_id=test_user.id,
        rating=4,
        review="Great deck for beginners!",
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating
