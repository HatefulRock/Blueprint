import uuid
from datetime import datetime

import sqlalchemy
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from services.database import Base

# --- Helper for default UUID generation ---
def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)

    # Progress tracking
    points = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    last_active_date = Column(Date, nullable=True)

    # Weekly stats
    new_words_this_week = Column(Integer, default=0)
    practice_sessions_this_week = Column(Integer, default=0)

    # Relationships
    decks = relationship("Deck", backref="owner", lazy=True)
    goals = relationship("Goal", backref="users", uselist=False)
    reading_content = relationship("ReadingContent", backref="users")
    writing_submissions = relationship("WritingSubmission", backref="user", lazy=True)
    grammar_exercise_sets = relationship("GrammarExerciseSet", backref="user", lazy=True)
    grammar_attempts = relationship("GrammarExerciseAttempt", backref="user", lazy=True)
    video_content = relationship("VideoContent", back_populates="user", lazy=True)
    video_exercise_attempts = relationship("VideoExerciseAttempt", back_populates="user", lazy=True)


class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Weekly targets (existing)
    words_per_week = Column(Integer, default=20)
    practice_sessions_per_week = Column(Integer, default=3)

    # Daily targets (NEW)
    cards_per_day = Column(Integer, default=20)
    minutes_per_day = Column(Integer, default=15)
    grammar_exercises_per_day = Column(Integer, default=5)

    # Streak management (NEW)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    streak_freezes_available = Column(Integer, default=2)
    last_activity_date = Column(Date, nullable=True)

    updated_at = Column(DateTime, default=datetime.utcnow)


class UserProfile(Base):
    """Extended user profile for learning preferences and placement results."""
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Placement/diagnostic results
    estimated_level = Column(String(10), nullable=True)  # A1, A2, B1, B2, C1, C2
    placement_completed_at = Column(DateTime, nullable=True)
    placement_score = Column(Integer, nullable=True)
    placement_language = Column(String(50), nullable=True)

    # Learning preferences
    daily_goal_minutes = Column(Integer, default=15)
    daily_goal_cards = Column(Integer, default=20)
    preferred_practice_time = Column(String(20), nullable=True)  # morning, afternoon, evening
    notification_enabled = Column(Boolean, default=True)
    preferred_practice_modes = Column(Text, nullable=True)  # JSON array of modes

    # Streak protection
    streak_freezes_remaining = Column(Integer, default=2)
    last_streak_freeze_used = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="profile", uselist=False)


class Deck(Base):
    __tablename__ = "decks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    language = Column(String(50), nullable=False, index=True)
    default_template_id = Column(UUID(as_uuid=True), ForeignKey("card_templates.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    words = relationship("Word", backref="deck", cascade="all, delete-orphan")
    cards = relationship("Card", backref="deck", cascade="all, delete-orphan")


class CardTemplate(Base):
    __tablename__ = "card_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    language = Column(String(50), nullable=True)
    front_template = Column(Text, nullable=False)
    back_template = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Card(Base):
    __tablename__ = "cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deck_id = Column(UUID(as_uuid=True), ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("card_templates.id", ondelete="SET NULL"), nullable=True)
    word_id = Column(UUID(as_uuid=True), ForeignKey("words.id", ondelete="SET NULL"), nullable=True, index=True)

    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)

    # SRS fields (SM-2)
    repetition = Column(Integer, default=0)
    easiness_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=0)
    next_review_date = Column(DateTime, default=datetime.utcnow, index=True)
    last_reviewed_date = Column(DateTime, nullable=True)

    # Leech tracking
    lapses = Column(Integer, default=0)  # Times failed after learning
    is_leech = Column(Boolean, default=False)  # Flagged as problematic
    total_reviews = Column(Integer, default=0)  # Lifetime review count


class Word(Base):
    __tablename__ = "words"
    __table_args__ = (
        sqlalchemy.UniqueConstraint('deck_id', 'term', name='uq_deck_term'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deck_id = Column(UUID(as_uuid=True), ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, index=True)

    term = Column(String(100), nullable=False, index=True)
    context = Column(Text, nullable=False)
    translation = Column(String(200))

    # Details
    part_of_speech = Column(String(50))
    grammatical_breakdown = Column(Text)
    literal_translation = Column(String(200))

    reading_content_id = Column(UUID(as_uuid=True), ForeignKey("reading_content.id", ondelete="SET NULL"), nullable=True)

    encounters = Column(Integer, default=0)
    status = Column(String(30), default="new", index=True)

    contexts = relationship("WordContext", backref="word", cascade="all, delete-orphan")
    video_occurrences = relationship("VideoVocabulary", back_populates="word", lazy=True)

    familiarity_score = Column(Integer, default=0)
    easiness_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=0)
    next_review_date = Column(DateTime, default=datetime.utcnow, index=True)
    last_reviewed_date = Column(DateTime, nullable=True)

    # Leech tracking
    lapses = Column(Integer, default=0)  # Times failed after learning
    is_leech = Column(Boolean, default=False)  # Flagged as problematic


class WordContext(Base):
    __tablename__ = "word_contexts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    word_id = Column(UUID(as_uuid=True), ForeignKey("words.id", ondelete="CASCADE"), nullable=False, index=True)
    reading_content_id = Column(UUID(as_uuid=True), ForeignKey("reading_content.id", ondelete="SET NULL"), nullable=True)
    sentence = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReadingContent(Base):
    __tablename__ = "reading_content"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    source_url = Column(String(500))
    language = Column(String(50), nullable=True, index=True)
    difficulty_score = Column(String(20))

    created_at = Column(DateTime, default=datetime.utcnow)


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    session_type = Column(String(50))
    language = Column(String(50), nullable=True, index=True)
    score = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    reviews = relationship("PracticeReview", backref="session", cascade="all, delete-orphan")


class PracticeReview(Base):
    __tablename__ = "practice_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    quality = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Enhanced telemetry fields
    response_time_ms = Column(Integer, nullable=True)  # Time to answer in milliseconds
    confidence = Column(Integer, nullable=True)  # User-reported confidence 1-5
    answer_text = Column(Text, nullable=True)  # What user entered
    is_correct = Column(Boolean, nullable=True)  # Explicit correctness flag


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scenario = Column(String(100), nullable=False)
    target_language = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    messages = relationship("ConversationMessage", backref="session", cascade="all, delete-orphan")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("conversation_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    author = Column(String(10))
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


class WritingSubmission(Base):
    __tablename__ = "writing_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    prompt = Column(Text, nullable=True)

    word_count = Column(Integer, default=0)
    language = Column(String(50), nullable=False, index=True)
    submission_type = Column(String(50), default="journal")

    grammar_feedback = Column(Text, nullable=True)
    corrected_text = Column(Text, nullable=True)
    overall_feedback = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GrammarExerciseSet(Base):
    __tablename__ = "grammar_exercise_sets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reading_content_id = Column(UUID(as_uuid=True), ForeignKey("reading_content.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(200), nullable=False)
    language = Column(String(50), nullable=False, index=True)
    difficulty_level = Column(String(10), nullable=True)
    source_text = Column(Text, nullable=True)

    total_exercises = Column(Integer, default=0)
    completed_exercises = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    exercises = relationship("GrammarExercise", backref="exercise_set", cascade="all, delete-orphan")


class GrammarExercise(Base):
    __tablename__ = "grammar_exercises"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exercise_set_id = Column(UUID(as_uuid=True), ForeignKey("grammar_exercise_sets.id", ondelete="CASCADE"), nullable=False, index=True)

    exercise_type = Column(String(50), nullable=False)
    question = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)
    options = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    grammar_point = Column(String(100), nullable=True)

    attempts = Column(Integer, default=0)
    correct_attempts = Column(Integer, default=0)
    last_attempted = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class GrammarExerciseAttempt(Base):
    __tablename__ = "grammar_exercise_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id = Column(UUID(as_uuid=True), ForeignKey("grammar_exercises.id", ondelete="CASCADE"), nullable=False, index=True)

    user_answer = Column(Text, nullable=False)
    is_correct = Column(Integer, default=0)
    time_spent_seconds = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class VideoContent(Base):
    __tablename__ = "video_content"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    target_language = Column(String(50), nullable=False, index=True)

    transcript = Column(JSONB, nullable=False)
    vocabulary = Column(JSONB, nullable=False)
    grammar_points = Column(JSONB, nullable=True)
    exercises = Column(JSONB, nullable=True)

    difficulty_level = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="video_content")
    video_vocabulary = relationship("VideoVocabulary", back_populates="video", cascade="all, delete-orphan")
    exercise_attempts = relationship("VideoExerciseAttempt", back_populates="video", cascade="all, delete-orphan")


class VideoVocabulary(Base):
    __tablename__ = "video_vocabulary"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(UUID(as_uuid=True), ForeignKey("video_content.id", ondelete="CASCADE"), nullable=False, index=True)
    word_id = Column(UUID(as_uuid=True), ForeignKey("words.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(String(10), nullable=True)
    context = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("VideoContent", back_populates="video_vocabulary")
    word = relationship("Word", back_populates="video_occurrences")


class VideoExerciseAttempt(Base):
    __tablename__ = "video_exercise_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id = Column(UUID(as_uuid=True), ForeignKey("video_content.id", ondelete="CASCADE"), nullable=False, index=True)

    exercise_type = Column(String(50), nullable=False)
    question_index = Column(Integer, nullable=False)
    user_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=False)

    time_spent_seconds = Column(Integer, nullable=True)
    attempted_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="video_exercise_attempts")
    video = relationship("VideoContent", back_populates="exercise_attempts")


# --- Community Features ---

class PublicDeck(Base):
    """Community-shared deck available for import by other users."""
    __tablename__ = "public_decks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_deck_id = Column(UUID(as_uuid=True), ForeignKey("decks.id", ondelete="SET NULL"), nullable=True)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String(50), nullable=False, index=True)
    level = Column(String(10), nullable=True)  # CEFR level

    # Content snapshot (denormalized for performance)
    card_count = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    preview_cards = Column(JSONB, nullable=True)  # Sample cards for preview

    # Moderation
    status = Column(String(20), default="pending", index=True)  # pending, approved, rejected
    moderation_notes = Column(Text, nullable=True)
    moderated_at = Column(DateTime, nullable=True)
    moderated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Stats
    downloads = Column(Integer, default=0)
    rating_sum = Column(Integer, default=0)
    rating_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], backref="published_decks")
    original_deck = relationship("Deck", foreign_keys=[original_deck_id])
    ratings = relationship("DeckRating", back_populates="deck", cascade="all, delete-orphan")


class DeckRating(Base):
    """User rating and review for a public deck."""
    __tablename__ = "deck_ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deck_id = Column(UUID(as_uuid=True), ForeignKey("public_decks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    rating = Column(Integer, nullable=False)  # 1-5 stars
    review = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    deck = relationship("PublicDeck", back_populates="ratings")
    user = relationship("User")

    __table_args__ = (
        sqlalchemy.UniqueConstraint('deck_id', 'user_id', name='uq_deck_user_rating'),
    )


class Challenge(Base):
    """Weekly or monthly learning challenge for community engagement."""
    __tablename__ = "challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # null = system challenge

    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    challenge_type = Column(String(50), nullable=False)  # vocabulary, streak, grammar, time, mixed

    # Goals
    target_value = Column(Integer, nullable=False)  # e.g., 100 words, 7 day streak
    target_metric = Column(String(50), nullable=False)  # words_learned, streak_days, exercises_completed, reviews_done

    # Duration
    start_date = Column(DateTime, nullable=False, index=True)
    end_date = Column(DateTime, nullable=False, index=True)

    # Participation settings
    is_public = Column(Boolean, default=True)
    max_participants = Column(Integer, nullable=True)
    language = Column(String(50), nullable=True)  # Optional language filter

    # Rewards (optional)
    reward_points = Column(Integer, default=0)
    badge_name = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id])
    participants = relationship("ChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan")


class ChallengeParticipant(Base):
    """User participation in a challenge with progress tracking."""
    __tablename__ = "challenge_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    current_progress = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    joined_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    challenge = relationship("Challenge", back_populates="participants")
    user = relationship("User")

    __table_args__ = (
        sqlalchemy.UniqueConstraint('challenge_id', 'user_id', name='uq_challenge_user'),
    )