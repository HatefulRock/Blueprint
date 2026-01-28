import uuid
from datetime import datetime

import sqlalchemy
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from backend.services.database import Base

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

    # The targets
    words_per_week = Column(Integer, default=20)
    practice_sessions_per_week = Column(Integer, default=3)

    updated_at = Column(DateTime, default=datetime.utcnow)


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


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
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