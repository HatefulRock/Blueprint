from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: UUID  
    points: int
    streak: int
    new_words_this_week: int
    practice_sessions_this_week: int

    class Config:
        orm_mode = True


# --- Authentication Schemas ---
class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    token: str
    token_type: str = "bearer"
    id: UUID  
    username: str


class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    username: Optional[str] = None


class UserMe(BaseModel):
    id: UUID
    username: str
    email: Optional[str] = None
    points: int
    streak: int

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
    deck_id: Optional[UUID] = None

    # New fields for phased rollout
    reading_content_id: Optional[UUID] = None
    encounters: Optional[int] = 0
    status: Optional[str] = "new"


class WordCreate(WordBase):
    pass


class WordUpdate(BaseModel):
    familiarity_score: Optional[int] = None
    next_review_date: Optional[datetime] = None


class WordRead(WordBase):
    id: UUID
    familiarity_score: int
    next_review_date: datetime
    last_reviewed_date: Optional[datetime] = None

    class Config:
        orm_mode = True


class WordContextRead(BaseModel):
    id: UUID
    word_id: UUID
    reading_content_id: Optional[UUID] = None
    sentence: str
    created_at: datetime

    class Config:
        orm_mode = True


class ContentBase(BaseModel):
    title: str
    content: str
    source_url: Optional[str] = None


class ContentCreate(ContentBase):
    user_id: Optional[UUID] = None


class ContentImport(BaseModel):
    url: str
    user_id: Optional[UUID] = None
    target_language: Optional[str] = None


class ContentRead(ContentBase):
    id: UUID
    difficulty_score: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


# --- Flashcards Schemas ---
class CardTemplateBase(BaseModel):
    name: str
    front_template: str
    back_template: str
    language: Optional[str] = None


class CardTemplateCreate(CardTemplateBase):
    user_id: Optional[UUID] = None


class CardTemplateUpdate(BaseModel):
    name: Optional[str] = None
    front_template: Optional[str] = None
    back_template: Optional[str] = None
    language: Optional[str] = None


class CardTemplateRead(CardTemplateBase):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        orm_mode = True


class CardBase(BaseModel):
    deck_id: UUID
    template_id: Optional[UUID] = None
    front: str
    back: str


class CardCreate(CardBase):
    pass


class CardRead(CardBase):
    id: UUID
    repetition: int
    easiness_factor: float
    interval: int
    next_review_date: datetime
    last_reviewed_date: Optional[datetime] = None
    word_id: Optional[UUID] = None

    class Config:
        orm_mode = True


class DeckRead(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    language: str
    default_template_id: Optional[UUID] = None

    class Config:
        orm_mode = True


class CardReviewRequest(BaseModel):
    rating: int  # 0-5 quality rating as SM-2 (0 worst, 5 perfect)
    session_id: Optional[UUID] = None


class AnalysisRequest(BaseModel):
    text: str
    target_language: str
    context_sentence: Optional[str] = None

# class AnalysisResponse(BaseModel):
#     translation: str
#     literal_translation: Optional[str] = None
#     grammar_breakdown: Optional[str] = None
#     vocabulary: Optional[List[dict]] = None  # [{term, pos, translation, pinyin}]
#     difficulty_level: Optional[str] = None
#     usage_examples: Optional[List[UsageExample]] = None
#     memory_aid: Optional[str] = None
#     related_words: Optional[List[str]] = None
#     context_sentence: Optional[str] = None


class ExplanationRequest(BaseModel):
    text: str
    grammar_point: str
    target_language: str


class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    user_id: UUID
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
    deck_id: Optional[UUID] = None
    context: Optional[str] = None
    reading_content_id: Optional[UUID] = None
    analysis: Optional[dict] = None
    create_card: Optional[bool] = False


class VocabCaptureResponse(BaseModel):
    action: str
    # Use WordRead for returned word payload when possible
    word: Optional[WordRead] = None

    class Config:
        orm_mode = True


class VocabWordDetailResponse(BaseModel):
    word: WordRead
    contexts: List[WordContextRead] = []

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


# --- Writing Submission Schemas ---
class WritingSubmissionCreate(BaseModel):
    title: Optional[str] = None
    content: str
    prompt: Optional[str] = None
    language: str
    submission_type: str = "journal"  # journal, essay, letter, story


class WritingSubmissionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    grammar_feedback: Optional[str] = None
    corrected_text: Optional[str] = None
    overall_feedback: Optional[str] = None
    score: Optional[int] = None


class WritingSubmissionRead(BaseModel):
    id: UUID
    user_id: UUID
    title: Optional[str]
    content: str
    prompt: Optional[str]
    word_count: int
    language: str
    submission_type: str
    grammar_feedback: Optional[str]
    corrected_text: Optional[str]
    overall_feedback: Optional[str]
    score: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class GrammarCheckRequest(BaseModel):
    text: str
    language: str


class GrammarCheckResponse(BaseModel):
    original_text: str
    corrected_text: str
    corrections: List[dict]  # List of {position, original, correction, explanation}
    feedback: str


class EssayFeedbackRequest(BaseModel):
    text: str
    language: str
    submission_type: str = "essay"


class EssayFeedbackResponse(BaseModel):
    score: int  # 0-100
    strengths: List[str]
    areas_for_improvement: List[str]
    vocabulary_suggestions: List[dict]
    grammar_notes: str
    overall_feedback: str


# --- Grammar Exercise Schemas ---
class GrammarExerciseRead(BaseModel):
    id: UUID
    exercise_set_id: UUID
    exercise_type: str
    question: str
    correct_answer: str
    options: Optional[str]
    explanation: Optional[str]
    grammar_point: Optional[str]
    attempts: int
    correct_attempts: int
    last_attempted: Optional[datetime]
    created_at: datetime

    class Config:
        orm_mode = True


class GrammarExerciseSetRead(BaseModel):
    id: UUID
    user_id: UUID
    reading_content_id: Optional[UUID]
    title: str
    language: str
    difficulty_level: Optional[str]
    source_text: Optional[str]
    total_exercises: int
    completed_exercises: int
    created_at: datetime
    exercises: List[GrammarExerciseRead] = []

    class Config:
        orm_mode = True


class GenerateExercisesRequest(BaseModel):
    text: str
    language: str
    difficulty_level: Optional[str] = None
    exercise_types: List[str] = [
        "fill_blank",
        "transformation",
        "multiple_choice",
        "correction",
    ]
    num_exercises: int = 10


class CheckAnswerRequest(BaseModel):
    exercise_id: UUID
    user_answer: str


class CheckAnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
    user_answer: str

class UsageExample(BaseModel):
    example: str = Field(description="Sentence in the target language")
    translation: str = Field(description="English translation of the example")

class VocabularyItem(BaseModel):
    term: str
    pos: str = Field(description="Part of speech (e.g., noun, verb)")
    translation: str
    pinyin: Optional[str] = Field(None, description="Pronunciation guide if applicable (e.g. for Chinese/Japanese)")

class AnalysisResponse(BaseModel):
    """
    Strict schema for the /analyze endpoint.
    Gemini will fill this exact structure.
    """
    translation: str
    literal_translation: str
    grammar_breakdown: str = Field(description="Detailed explanation of grammar")
    vocabulary: List[VocabularyItem] 
    difficulty_level: str = Field(description="CEFR level (A1-C2)")
    usage_examples: List[UsageExample]
    memory_aid: Optional[str] = Field(None, description="Mnemonic or tip (only for single words)")
    related_words: List[str] = Field(description="3-5 related terms")
    context_sentence: Optional[str] = None # Helper field, usually not generated by AI

# --- Quiz Schemas ---
class QuizOption(BaseModel):
    text: str
    label: str = Field(description="A, B, C, or D")

class QuizQuestion(BaseModel):
    question: str
    options: List[str] = Field(description="List of possible answers")
    answer: str = Field(description="The correct answer string")
    explanation: str
    
class QuizResponse(BaseModel):
    questions: List[QuizQuestion]

# --- Audio Tutor Schema ---
class AudioTutorResponse(BaseModel):
    transcription: str
    reply: str = Field(description="Response in the target language")
    feedback: str = Field(description="Feedback on pronunciation and grammar in English")

class TextStats(BaseModel):
    total_characters: int
    total_words: int
    estimated_reading_time_minutes: float

class SummarySection(BaseModel):
    main_theme: str
    key_points: List[str]
    author_purpose: str
    tone: str
    target_audience: str
    overview: str = Field(description="3-5 sentence overview")

class VocabAnalysisItem(BaseModel):
    word: str
    translation: str
    part_of_speech: str
    level: str = Field(description="CEFR level (A1-C2)")
    frequency: int
    example: str = Field(description="Example sentence from the text")
    usefulness_reason: str
    rank: int

class GrammarPatternItem(BaseModel):
    pattern_name: str
    description: str
    difficulty: str
    examples: List[str]
    importance: str

class IdiomItem(BaseModel):
    expression: str
    meaning: str

class CulturalContextSection(BaseModel):
    references: List[str]
    idioms: List[IdiomItem]
    regional_features: Optional[str] = None
    background_knowledge: Optional[str] = None

class DifficultyProgressionSection(BaseModel):
    beginning: str
    middle: str
    end: str
    challenging_sections: List[str]
    reading_strategy: str

class DiscussionQuestion(BaseModel):
    question: str
    type: str = Field(description="comprehension, analysis, or synthesis")
    suggested_vocabulary: List[str]

class RelatedContentSection(BaseModel):
    similar_texts: List[str]
    topics: List[str]
    authors: List[str]
    easier_alternatives: List[str]
    harder_alternatives: List[str]

class LongContentAnalysisResponse(BaseModel):
    text_stats: TextStats
    summary: SummarySection
    vocabulary: List[VocabAnalysisItem]
    grammar_patterns: List[GrammarPatternItem]
    cultural_context: CulturalContextSection
    difficulty_progression: DifficultyProgressionSection
    discussion_questions: List[DiscussionQuestion]
    related_content: RelatedContentSection


class BulkCardCreate(BaseModel):
    word_ids: List[UUID]
    template_id: Optional[UUID] = None
    deck_id: Optional[UUID] = None

class StudySessionRequest(BaseModel):
    deck_id: UUID
    session_date: date = Field(default_factory=date.today)
    duration_minutes: Optional[int] = None