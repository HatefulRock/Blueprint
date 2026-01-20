from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: int
    points: int
    streak: int
    new_words_this_week: int
    practice_sessions_this_week: int

    class Config:
        orm_mode = True


class GoalUpdate(BaseModel):
    words_per_week: int
    practice_sessions_per_week: int


class WordBase(BaseModel):
    term: str
    context: Optional[str] = None
    translation: Optional[str] = None
    part_of_speech: Optional[str] = None
    grammatical_breakdown: Optional[str] = None
    literal_translation: Optional[str] = None
    deck_id: int


class WordCreate(WordBase):
    pass


class WordUpdate(BaseModel):
    familiarity_score: Optional[int] = None
    next_review_date: Optional[datetime] = None


class WordRead(WordBase):
    id: int
    familiarity_score: int
    next_review_date: datetime
    last_reviewed_date: Optional[datetime] = None

    class Config:
        orm_mode = True


class ContentBase(BaseModel):
    title: str
    content: str
    source_url: Optional[str] = None


class ContentCreate(ContentBase):
    user_id: int


class ContentImport(BaseModel):
    url: str
    user_id: int


class ContentRead(ContentBase):
    id: int
    difficulty_score: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class AnalysisRequest(BaseModel):
    text: str
    target_language: str
    context_sentence: Optional[str] = None


class AnalysisResponse(BaseModel):
    translation: str
    literal_translation: str
    grammar_breakdown: str
    vocabulary: List[dict]  # [{term, pos, translation}]


class ExplanationRequest(BaseModel):
    text: str
    grammar_point: str
    target_language: str


class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    user_id: int
    text: Optional[str] = None
    scenario: str  # e.g., "At a coffee shop"
    target_language: str
    history: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    feedback: Optional[str] = None  # Corrections for the user's mistakes
    transcription: Optional[str] = None  # Used for audio input
