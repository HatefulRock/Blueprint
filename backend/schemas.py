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

    # New fields for phased rollout
    reading_content_id: Optional[int] = None
    encounters: Optional[int] = 0
    status: Optional[str] = "new"


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


# --- Flashcards Schemas ---
class CardTemplateBase(BaseModel):
    name: str
    front_template: str
    back_template: str


class CardTemplateCreate(CardTemplateBase):
    user_id: Optional[int] = None


class CardTemplateRead(CardTemplateBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        orm_mode = True


class CardBase(BaseModel):
    deck_id: int
    template_id: Optional[int] = None
    front: str
    back: str


class CardCreate(CardBase):
    pass


class CardRead(CardBase):
    id: int
    repetition: int
    easiness_factor: float
    interval: int
    next_review_date: datetime
    last_reviewed_date: Optional[datetime] = None

    class Config:
        orm_mode = True


class DeckRead(BaseModel):
    id: int
    user_id: int
    name: str
    language: str

    class Config:
        orm_mode = True


class CardReviewRequest(BaseModel):
    rating: int  # 0-5 quality rating as SM-2 (0 worst, 5 perfect)
    session_id: Optional[int] = None


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
    tutor_style: Optional[str] = "Friendly"
    topic: Optional[str] = None
    voice: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    feedback: Optional[str] = None  # Corrections for the user's mistakes
    transcription: Optional[str] = None  # Used for audio input
    tts_base64: Optional[str] = (
        None  # Base64-encoded audio (mp3) of the assistant reply
    )


# --- Vocab Capture Schema ---
class VocabCaptureRequest(BaseModel):
    term: str
    deck_id: Optional[int] = 1
    context: Optional[str] = None
    reading_content_id: Optional[int] = None
    analysis: Optional[dict] = None


class VocabCaptureResponse(BaseModel):
    action: str
    # Use WordRead for returned word payload when possible
    word: Optional[WordRead] = None

    class Config:
        orm_mode = True


# --- Dictionary Lookup Schema ---
class DictionaryEntry(BaseModel):
    term: str
    translation: Optional[str] = None
    part_of_speech: Optional[str] = None
    source: Optional[str] = None


class DictionaryLookupResponse(BaseModel):
    text: str
    type: str
    target_language: str
    native_language: Optional[str] = None
    entry: Optional[DictionaryEntry] = None
    raw: Optional[dict] = None
