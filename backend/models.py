from datetime import datetime

import sqlalchemy
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
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
    hashed_password = Column(String(255), nullable=True)  # nullable for migration

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
    writing_submissions = relationship("WritingSubmission", backref="user", lazy=True)
    grammar_exercise_sets = relationship("GrammarExerciseSet", backref="user", lazy=True)
    grammar_attempts = relationship("GrammarExerciseAttempt", backref="user", lazy=True)


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
    __table_args__ = (
        # Ensure a user can't create duplicate deck names for the same language
        # This is a soft constraint - users can have "Spanish Verbs" and "Spanish Nouns"
        # But prevents accidental duplicates
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    language = Column(String(50), nullable=False, index=True)
    default_template_id = Column(Integer, ForeignKey("card_templates.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    words = relationship("Word", backref="deck", cascade="all, delete-orphan")
    cards = relationship("Card", backref="deck", cascade="all, delete-orphan")


class CardTemplate(Base):
    __tablename__ = "card_templates"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )  # null => default/global template
    name = Column(String(100), nullable=False)
    language = Column(String(50), nullable=True)  # Optional: associate template with language
    front_template = Column(Text, nullable=False)
    back_template = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True)
    deck_id = Column(Integer, ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("card_templates.id", ondelete="SET NULL"), nullable=True)

    # Link back to originating Word (optional)
    word_id = Column(Integer, ForeignKey("words.id", ondelete="SET NULL"), nullable=True, index=True)

    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)

    # SRS fields (SM-2)
    repetition = Column(
        Integer, default=0
    )  # number of consecutive successful repetitions
    easiness_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=0)  # days
    next_review_date = Column(DateTime, default=datetime.utcnow, index=True)  # Indexed for due cards query
    last_reviewed_date = Column(DateTime, nullable=True)


class Word(Base):
    __tablename__ = "words"
    __table_args__ = (
        # Prevent duplicate words in the same deck
        # Users can have the same word in different decks (e.g., different languages)
        sqlalchemy.UniqueConstraint('deck_id', 'term', name='uq_deck_term'),
    )

    id = Column(Integer, primary_key=True)
    deck_id = Column(Integer, ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, index=True)

    term = Column(String(100), nullable=False, index=True)  # Indexed for search
    context = Column(Text, nullable=False)
    translation = Column(String(200))

    # Details
    part_of_speech = Column(String(50))
    grammatical_breakdown = Column(Text)  # Storing JSON as text for simplicity
    literal_translation = Column(String(200))

    # Optional link to the ReadingContent this word was found in
    reading_content_id = Column(
        Integer, ForeignKey("reading_content.id", ondelete="SET NULL"), nullable=True
    )

    # Encounters count and lightweight status for phased rollout
    encounters = Column(Integer, default=0)
    status = Column(String(30), default="new", index=True)  # Indexed for filtering by status

    # Relationship to store multiple contexts/sentences for the same word
    contexts = relationship("WordContext", backref="word", cascade="all, delete-orphan")

    # Spaced Repetition (SRS) Data
    familiarity_score = Column(Integer, default=0)
    easiness_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=0)
    next_review_date = Column(DateTime, default=datetime.utcnow, index=True)  # Indexed for due words query
    last_reviewed_date = Column(DateTime, nullable=True)


class WordContext(Base):
    __tablename__ = "word_contexts"

    id = Column(Integer, primary_key=True)
    word_id = Column(Integer, ForeignKey("words.id", ondelete="CASCADE"), nullable=False, index=True)
    reading_content_id = Column(
        Integer, ForeignKey("reading_content.id", ondelete="SET NULL"), nullable=True
    )
    sentence = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReadingContent(Base):
    __tablename__ = "reading_content"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    source_url = Column(String(500))
    language = Column(String(50), nullable=True, index=True)  # CRITICAL: Track content language
    difficulty_score = Column(String(20))

    created_at = Column(DateTime, default=datetime.utcnow)


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    session_type = Column(String(50))  # e.g., "flashcards", "chat"
    language = Column(String(50), nullable=True, index=True)  # CRITICAL: Track session language
    score = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)  # Indexed for analytics queries

    # reviews relationship
    reviews = relationship(
        "PracticeReview", backref="session", cascade="all, delete-orphan"
    )


class PracticeReview(Base):
    __tablename__ = "practice_reviews"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    quality = Column(Integer)  # 0-5
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)  # Indexed for analytics


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    author = Column(String(10))  # 'user' or 'ai'
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


class WritingSubmission(Base):
    __tablename__ = "writing_submissions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Content
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    prompt = Column(Text, nullable=True)  # Optional writing prompt used

    # Metadata
    word_count = Column(Integer, default=0)
    language = Column(String(50), nullable=False, index=True)  # Indexed for filtering by language
    submission_type = Column(
        String(50), default="journal"
    )  # journal, essay, letter, story, etc.

    # AI Feedback
    grammar_feedback = Column(Text, nullable=True)
    corrected_text = Column(Text, nullable=True)
    overall_feedback = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)  # 0-100 score

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)  # Indexed for sorting
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GrammarExerciseSet(Base):
    __tablename__ = "grammar_exercise_sets"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reading_content_id = Column(
        Integer, ForeignKey("reading_content.id", ondelete="SET NULL"), nullable=True
    )

    # Metadata
    title = Column(String(200), nullable=False)
    language = Column(String(50), nullable=False, index=True)  # Indexed for filtering by language
    difficulty_level = Column(String(10), nullable=True)  # A1, A2, B1, B2, C1, C2
    source_text = Column(Text, nullable=True)  # Original text exercises are based on

    # Statistics
    total_exercises = Column(Integer, default=0)
    completed_exercises = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)  # Indexed for sorting

    # Relationship
    exercises = relationship(
        "GrammarExercise", backref="exercise_set", cascade="all, delete-orphan"
    )


class GrammarExercise(Base):
    __tablename__ = "grammar_exercises"

    id = Column(Integer, primary_key=True)
    exercise_set_id = Column(
        Integer, ForeignKey("grammar_exercise_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Exercise content
    exercise_type = Column(
        String(50), nullable=False
    )  # fill_blank, transformation, multiple_choice, correction
    question = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)
    options = Column(Text, nullable=True)  # JSON array for multiple choice
    explanation = Column(Text, nullable=True)
    grammar_point = Column(String(100), nullable=True)  # e.g., "present tense", "ser vs estar"

    # User progress
    attempts = Column(Integer, default=0)
    correct_attempts = Column(Integer, default=0)
    last_attempted = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


class GrammarExerciseAttempt(Base):
    __tablename__ = "grammar_exercise_attempts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id = Column(Integer, ForeignKey("grammar_exercises.id", ondelete="CASCADE"), nullable=False, index=True)

    # Attempt data
    user_answer = Column(Text, nullable=False)
    is_correct = Column(Integer, default=0)  # 0 or 1 (boolean)
    time_spent_seconds = Column(Integer, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, index=True)  # Indexed for analytics
