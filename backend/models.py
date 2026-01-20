from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from backend.services.database import (
    Base,
)  # Ensure this import points to your actual database.py file


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(
        String(120), unique=True, nullable=True
    )  # Added email as it's common

    # Progress tracking
    points = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    last_active_date = Column(Date, nullable=True)

    # Weekly stats
    new_words_this_week = Column(Integer, default=0)
    practice_sessions_this_week = Column(Integer, default=0)

    # Relationships
    decks = relationship("Deck", backref="owner", lazy=True)
    # uselist=False makes this a One-to-One relationship
    goals = relationship("Goal", backref="users", uselist=False)
    reading_content = relationship("ReadingContent", backref="users")


# --- ADDED THIS MISSING CLASS ---
class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # The targets
    words_per_week = Column(Integer, default=20)
    practice_sessions_per_week = Column(Integer, default=3)

    updated_at = Column(DateTime, default=datetime.utcnow)


# --------------------------------


class Deck(Base):
    __tablename__ = "decks"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    language = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    words = relationship("Word", backref="deck", cascade="all, delete-orphan")

    cards = relationship("Card", backref="deck", cascade="all, delete-orphan")


class CardTemplate(Base):
    __tablename__ = "card_templates"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )  # null => default template
    name = Column(String(100), nullable=False)
    front_template = Column(Text, nullable=False)
    back_template = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True)
    deck_id = Column(Integer, ForeignKey("decks.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("card_templates.id"), nullable=True)

    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)

    # SRS fields (SM-2)
    repetition = Column(
        Integer, default=0
    )  # number of consecutive successful repetitions
    easiness_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=0)  # days
    next_review_date = Column(DateTime, default=datetime.utcnow)
    last_reviewed_date = Column(DateTime, nullable=True)


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True)
    deck_id = Column(Integer, ForeignKey("decks.id"), nullable=False)

    term = Column(String(100), nullable=False)
    context = Column(Text, nullable=False)
    translation = Column(String(200))

    # Details
    part_of_speech = Column(String(50))
    grammatical_breakdown = Column(Text)  # Storing JSON as text for simplicity
    literal_translation = Column(String(200))

    # Spaced Repetition (SRS) Data
    familiarity_score = Column(Integer, default=0)
    easiness_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=0)
    next_review_date = Column(DateTime, default=datetime.utcnow)
    last_reviewed_date = Column(DateTime, nullable=True)


class ReadingContent(Base):
    __tablename__ = "reading_content"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    source_url = Column(String(500))
    difficulty_score = Column(String(20))

    created_at = Column(DateTime, default=datetime.utcnow)


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    session_type = Column(String(50))  # e.g., "flashcards", "chat"
    score = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # reviews relationship
    reviews = relationship(
        "PracticeReview", backref="session", cascade="all, delete-orphan"
    )


class PracticeReview(Base):
    __tablename__ = "practice_reviews"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("practice_sessions.id"), nullable=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    quality = Column(Integer)  # 0-5
    timestamp = Column(DateTime, default=datetime.utcnow)
