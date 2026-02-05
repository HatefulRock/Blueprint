# Language Learning App Improvement Plan v2

**Last Updated:** 2026-02-03
**Status:** Planning
**Based on:** Codebase audit of current implementation

---

## Executive Summary

This plan builds on Blueprint's existing infrastructure including Gemini AI integration, video learning, grammar exercises, and analytics. Rather than rebuilding systems, we extend what exists.

---

## Current State Audit

### What Already Exists

| Feature | Location | Completeness |
|---------|----------|--------------|
| SM-2 SRS Algorithm | `services/srs.py` | Basic (38 lines) |
| Practice Sessions | `routers/practice.py` | 4 endpoints |
| Analytics Dashboard | `routers/analytics.py` | Comprehensive (442 lines) |
| Grammar Exercises | `models.py`, `routers/grammar.py` | Full CRUD + AI generation |
| Video Learning | `models.py`, `routers/video.py` | Models complete, endpoints partial |
| Writing Feedback | `models.py`, `routers/writing.py` | Full with AI feedback |
| Gemini AI Service | `services/gemini.py` | 10+ methods |
| Long-context Analysis | `services/gemini.py` | Working |
| Conversation Scenarios | `conversationScenarios.ts` | 10 scenarios |

### What's Missing

| Feature | Priority | Effort |
|---------|----------|--------|
| Response time tracking in reviews | High | Small |
| Confidence ratings | High | Small |
| Lapses/leech detection | High | Medium |
| Daily goals (only weekly exist) | Medium | Small |
| Placement/diagnostic test | Medium | Medium |
| Practice mode variety in frontend | High | Medium |
| Community deck sharing | Low | Large |

---

## Architecture Principles

1. **Extend, don't rebuild** - Use existing models and services
2. **Leverage Gemini** - AI is already integrated; use it for personalization
3. **Unify practice modes** - Connect Grammar, Video, Writing into cohesive experience
4. **Data-driven adaptation** - Use existing analytics for recommendations

---

## Phase 1: Enhanced Review Telemetry

**Goal:** Capture richer data per review to improve SRS and analytics.

### 1.1 Model Changes

**File:** `backend/models.py`

Add to `PracticeReview`:
```python
class PracticeReview(Base):
    # ... existing fields ...

    # NEW FIELDS
    response_time_ms = Column(Integer, nullable=True)  # Time to answer
    confidence = Column(Integer, nullable=True)        # User-reported 1-5
    answer_text = Column(Text, nullable=True)          # What user entered
    is_correct = Column(Boolean, nullable=True)        # Explicit correctness
```

Add to `Card`:
```python
class Card(Base):
    # ... existing fields ...

    # NEW FIELDS
    lapses = Column(Integer, default=0)           # Times failed after learning
    is_leech = Column(Boolean, default=False)     # Flagged as problematic
    total_reviews = Column(Integer, default=0)    # Lifetime review count
```

Add to `Word`:
```python
class Word(Base):
    # ... existing fields ...

    # NEW FIELDS
    lapses = Column(Integer, default=0)
    is_leech = Column(Boolean, default=False)
```

### 1.2 SRS Enhancements

**File:** `backend/services/srs.py`

```python
# Add after existing update_card_after_review function

LEECH_THRESHOLD = 8  # Lapses before flagging

def update_card_after_review(card, quality: int, response_time_ms: int = None):
    """Enhanced SM-2 with leech detection."""
    q = max(0, min(5, int(quality)))

    # Track lapses
    if q < 3:
        card.lapses = (card.lapses or 0) + 1
        card.repetition = 0
        card.interval = 1

        # Leech detection
        if card.lapses >= LEECH_THRESHOLD:
            card.is_leech = True
    else:
        card.repetition = (card.repetition or 0) + 1
        if card.repetition == 1:
            card.interval = 1
        elif card.repetition == 2:
            card.interval = 6
        else:
            prev_interval = card.interval or 1
            card.interval = int(round(prev_interval * (card.easiness_factor or 2.5)))

    # Response time factor (optional boost for fast correct answers)
    if response_time_ms and q >= 4 and response_time_ms < 3000:
        card.interval = int(card.interval * 1.1)  # 10% bonus

    # Update EF
    ef = card.easiness_factor or 2.5
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    card.easiness_factor = max(1.3, ef)

    card.total_reviews = (card.total_reviews or 0) + 1
    card.last_reviewed_date = datetime.utcnow()
    card.next_review_date = datetime.utcnow() + timedelta(days=card.interval)

    return card
```

### 1.3 API Changes

**File:** `backend/routers/practice.py`

Add new endpoint:
```python
@router.post("/review")
def submit_review(
    payload: schemas.ReviewSubmission,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a single card review with full telemetry.

    Payload:
        card_id: UUID
        quality: int (0-5)
        response_time_ms: int
        confidence: int (1-5)
        answer_text: str (optional)
    """
    card = db.query(models.Card).filter(models.Card.id == payload.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Verify ownership
    deck = db.query(models.Deck).filter(models.Deck.id == card.deck_id).first()
    if str(deck.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Update card via SRS
    from services.srs import update_card_after_review
    update_card_after_review(card, payload.quality, payload.response_time_ms)

    # Create review record
    review = models.PracticeReview(
        user_id=current_user.id,
        card_id=card.id,
        quality=payload.quality,
        response_time_ms=payload.response_time_ms,
        confidence=payload.confidence,
        answer_text=payload.answer_text,
        is_correct=payload.quality >= 3
    )
    db.add(review)
    db.commit()

    return {"ok": True, "next_review": card.next_review_date, "is_leech": card.is_leech}
```

**File:** `backend/schemas.py`

```python
class ReviewSubmission(BaseModel):
    card_id: str
    quality: int = Field(..., ge=0, le=5)
    response_time_ms: Optional[int] = None
    confidence: Optional[int] = Field(None, ge=1, le=5)
    answer_text: Optional[str] = None
```

### 1.4 Frontend Changes

**File:** `frontend/src/hooks/usePracticeSession.ts`

Add timing capture:
```typescript
const [reviewStartTime, setReviewStartTime] = useState<number>(0);

const startReview = () => {
  setReviewStartTime(Date.now());
};

const submitReview = async (cardId: string, quality: number, confidence?: number) => {
  const responseTimeMs = Date.now() - reviewStartTime;

  await api.post('/practice/review', {
    card_id: cardId,
    quality,
    response_time_ms: responseTimeMs,
    confidence,
  });
};
```

**File:** `frontend/src/components/features/flashcards/FlashcardView.tsx`

Add confidence buttons after reveal:
```typescript
<div className="confidence-buttons">
  <span>How confident?</span>
  {[1, 2, 3, 4, 5].map(level => (
    <button key={level} onClick={() => setConfidence(level)}>
      {level}
    </button>
  ))}
</div>
```

### 1.5 Migration

**File:** `backend/migrations/phase1_telemetry.sql`

```sql
-- Add telemetry fields to practice_reviews
ALTER TABLE practice_reviews
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS confidence INTEGER,
ADD COLUMN IF NOT EXISTS answer_text TEXT,
ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;

-- Add leech tracking to cards
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS lapses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_leech BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Add leech tracking to words
ALTER TABLE words
ADD COLUMN IF NOT EXISTS lapses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_leech BOOLEAN DEFAULT FALSE;

-- Index for finding leeches
CREATE INDEX IF NOT EXISTS idx_cards_leech ON cards(is_leech) WHERE is_leech = TRUE;
CREATE INDEX IF NOT EXISTS idx_words_leech ON words(is_leech) WHERE is_leech = TRUE;
```

### 1.6 Acceptance Criteria

- [ ] Each review sends response_time_ms and persists it
- [ ] Confidence rating captured optionally
- [ ] Cards with 8+ lapses flagged as leeches
- [ ] `/analytics/weak-areas` includes leech cards
- [ ] Dashboard shows average response time trend

---

## Phase 2: Unified Practice Experience

**Goal:** Connect existing Grammar, Video, and Writing systems into cohesive practice modes.

### 2.1 Leverage Existing Systems

The app already has:
- `GrammarExercise` with types: `fill_blank`, `transformation`, `multiple_choice`, `correction`
- `VideoExerciseAttempt` with types: `comprehension`, `vocabulary`, `grammar`, `speaking`, `writing`
- `WritingSubmission` with AI feedback

**Strategy:** Create a unified practice router that orchestrates these.

### 2.2 Unified Practice Router

**File:** `backend/routers/unified_practice.py` (NEW)

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Literal
import random

import models
from services.auth import get_current_user
from services.database import get_db
from services.practice_generator import PracticeGenerator

router = APIRouter(prefix="/practice/unified", tags=["unified-practice"])

PracticeMode = Literal["flashcards", "grammar", "video", "writing", "mixed"]


@router.get("/session")
async def get_unified_session(
    mode: PracticeMode = Query("mixed"),
    deck_id: str = Query(None),
    limit: int = Query(20),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a unified practice session mixing different exercise types.

    Modes:
    - flashcards: Traditional SRS card review
    - grammar: Grammar exercises from existing sets
    - video: Exercises from analyzed videos
    - writing: Writing prompts with AI feedback
    - mixed: Balanced mix of all types
    """
    session_items = []

    if mode in ["flashcards", "mixed"]:
        # Get due cards (existing logic)
        cards = get_due_cards(db, current_user.id, deck_id, limit if mode == "flashcards" else limit // 4)
        session_items.extend([{"type": "flashcard", "data": c} for c in cards])

    if mode in ["grammar", "mixed"]:
        # Get incomplete grammar exercises
        exercises = get_pending_grammar_exercises(db, current_user.id, limit if mode == "grammar" else limit // 4)
        session_items.extend([{"type": "grammar", "data": e} for e in exercises])

    if mode in ["video", "mixed"]:
        # Get video exercises user hasn't completed
        video_ex = get_pending_video_exercises(db, current_user.id, limit if mode == "video" else limit // 4)
        session_items.extend([{"type": "video", "data": e} for e in video_ex])

    if mode in ["writing", "mixed"]:
        # Generate writing prompts based on recent vocabulary
        prompts = generate_writing_prompts(db, current_user.id, limit if mode == "writing" else 2)
        session_items.extend([{"type": "writing", "data": p} for p in prompts])

    # Shuffle for mixed mode
    if mode == "mixed":
        random.shuffle(session_items)

    # Create session record
    session = models.PracticeSession(
        user_id=current_user.id,
        session_type=mode,
    )
    db.add(session)
    db.commit()

    return {
        "session_id": session.id,
        "mode": mode,
        "items": session_items,
        "total": len(session_items)
    }


def get_due_cards(db, user_id, deck_id, limit):
    """Fetch due flashcards."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    query = db.query(models.Card).join(models.Deck).filter(models.Deck.user_id == user_id)
    if deck_id:
        query = query.filter(models.Card.deck_id == deck_id)

    return query.filter(models.Card.next_review_date <= now).order_by(
        models.Card.next_review_date.asc()
    ).limit(limit).all()


def get_pending_grammar_exercises(db, user_id, limit):
    """Fetch grammar exercises with low completion."""
    return db.query(models.GrammarExercise).join(
        models.GrammarExerciseSet
    ).filter(
        models.GrammarExerciseSet.user_id == user_id,
        models.GrammarExercise.correct_attempts < 2  # Not yet mastered
    ).order_by(
        models.GrammarExercise.attempts.asc()  # Prioritize untried
    ).limit(limit).all()


def get_pending_video_exercises(db, user_id, limit):
    """Fetch video exercises user hasn't completed."""
    # Get videos user has
    videos = db.query(models.VideoContent).filter(
        models.VideoContent.user_id == user_id
    ).all()

    exercises = []
    for video in videos:
        if video.exercises:
            # Check which exercises haven't been attempted
            attempted = db.query(models.VideoExerciseAttempt.question_index).filter(
                models.VideoExerciseAttempt.video_id == video.id,
                models.VideoExerciseAttempt.user_id == user_id,
                models.VideoExerciseAttempt.is_correct == True
            ).all()
            attempted_indices = {a[0] for a in attempted}

            for ex_type in ['comprehension', 'vocabulary', 'grammar']:
                if ex_type in video.exercises:
                    for idx, ex in enumerate(video.exercises[ex_type]):
                        if idx not in attempted_indices:
                            exercises.append({
                                "video_id": video.id,
                                "exercise_type": ex_type,
                                "index": idx,
                                "exercise": ex
                            })

    return exercises[:limit]


def generate_writing_prompts(db, user_id, limit):
    """Generate contextual writing prompts from recent vocabulary."""
    # Get recent words
    recent_words = db.query(models.Word).join(models.Deck).filter(
        models.Deck.user_id == user_id
    ).order_by(models.Word.last_reviewed_date.desc()).limit(10).all()

    if not recent_words:
        return []

    prompts = []
    word_terms = [w.term for w in recent_words[:5]]

    prompts.append({
        "type": "vocabulary_use",
        "prompt": f"Write 3-5 sentences using these words: {', '.join(word_terms)}",
        "target_words": word_terms,
        "min_words": 30
    })

    if len(recent_words) > 5:
        prompts.append({
            "type": "story",
            "prompt": f"Write a short story (50-100 words) incorporating: {', '.join([w.term for w in recent_words[5:10]])}",
            "target_words": [w.term for w in recent_words[5:10]],
            "min_words": 50
        })

    return prompts[:limit]
```

### 2.3 Add to Main App

**File:** `backend/main.py`

```python
from routers import unified_practice

# Add with other routers
app.include_router(unified_practice.router)
```

### 2.4 Frontend Practice Mode Selector

**File:** `frontend/src/components/features/practice/PracticeView.tsx`

Add mode selection:
```typescript
type PracticeMode = 'flashcards' | 'grammar' | 'video' | 'writing' | 'mixed';

const [mode, setMode] = useState<PracticeMode>('mixed');

const modeOptions = [
  { value: 'mixed', label: 'Mixed Practice', icon: '🎯', description: 'Balanced mix of all types' },
  { value: 'flashcards', label: 'Flashcards', icon: '🃏', description: 'SRS vocabulary review' },
  { value: 'grammar', label: 'Grammar', icon: '📝', description: 'Grammar exercises' },
  { value: 'video', label: 'Video', icon: '🎬', description: 'Exercises from videos' },
  { value: 'writing', label: 'Writing', icon: '✍️', description: 'Writing with AI feedback' },
];

// Mode selector UI
<div className="mode-selector">
  {modeOptions.map(opt => (
    <button
      key={opt.value}
      className={mode === opt.value ? 'active' : ''}
      onClick={() => setMode(opt.value as PracticeMode)}
    >
      <span className="icon">{opt.icon}</span>
      <span className="label">{opt.label}</span>
    </button>
  ))}
</div>
```

### 2.5 Acceptance Criteria

- [ ] Users can select practice mode before starting
- [ ] Mixed mode includes items from all available types
- [ ] Grammar exercises from existing sets appear in practice
- [ ] Video exercises appear if user has analyzed videos
- [ ] Writing prompts use recent vocabulary
- [ ] All modes track to `PracticeSession` for analytics

---

## Phase 3: Personalization & Goals

**Goal:** Add placement test, daily goals, and AI-powered recommendations.

### 3.1 Diagnostic/Placement Test

**File:** `backend/models.py`

```python
class UserProfile(Base):
    """Extended user profile for learning preferences."""
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    # Placement results
    estimated_level = Column(String(10), nullable=True)  # A1, A2, B1, B2, C1, C2
    placement_completed_at = Column(DateTime, nullable=True)
    placement_score = Column(Integer, nullable=True)

    # Preferences
    daily_goal_minutes = Column(Integer, default=15)
    daily_goal_cards = Column(Integer, default=20)
    preferred_practice_time = Column(String(20), nullable=True)  # morning, afternoon, evening
    notification_enabled = Column(Boolean, default=True)

    # Streak protection
    streak_freezes_remaining = Column(Integer, default=2)
    last_streak_freeze_used = Column(Date, nullable=True)

    user = relationship("User", backref="profile", uselist=False)
```

**File:** `backend/routers/diagnostic.py` (NEW)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json

from google import genai
from google.genai import types

import models
from services.auth import get_current_user
from services.database import get_db
from config.gemini_models import GEMINI_MODELS

router = APIRouter(prefix="/diagnostic", tags=["diagnostic"])


@router.get("/start")
async def start_diagnostic(
    language: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a diagnostic test to assess user's level.
    Uses Gemini to create level-appropriate questions.
    """
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    prompt = f"""Create a language placement test for {language} with exactly 15 questions.

Questions should span A1 to C1 difficulty:
- 3 questions at A1 level (basic vocabulary, simple phrases)
- 3 questions at A2 level (simple sentences, common expressions)
- 3 questions at B1 level (intermediate grammar, opinions)
- 3 questions at B2 level (complex structures, nuance)
- 3 questions at C1 level (advanced idioms, subtle meaning)

Mix question types:
- Multiple choice (4 options)
- Fill in the blank
- Translation (short phrases)

Return JSON:
{{
  "questions": [
    {{
      "id": 1,
      "level": "A1",
      "type": "multiple_choice",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "..."
    }}
  ]
}}
"""

    response = client.models.generate_content(
        model=GEMINI_MODELS["reasoning"],
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )

    return json.loads(response.text)


@router.post("/submit")
async def submit_diagnostic(
    payload: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit diagnostic answers and calculate level.

    Payload:
        answers: [{question_id: int, answer: str, level: str}]
    """
    answers = payload.get("answers", [])

    # Score by level
    level_scores = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0}
    level_totals = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0}

    for ans in answers:
        level = ans.get("level", "A1")
        level_totals[level] = level_totals.get(level, 0) + 1
        if ans.get("is_correct"):
            level_scores[level] = level_scores.get(level, 0) + 1

    # Determine level (highest level with >60% accuracy)
    estimated_level = "A1"
    level_order = ["A1", "A2", "B1", "B2", "C1"]

    for level in level_order:
        if level_totals[level] > 0:
            accuracy = level_scores[level] / level_totals[level]
            if accuracy >= 0.6:
                estimated_level = level

    total_score = sum(level_scores.values())

    # Update or create profile
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()

    if not profile:
        profile = models.UserProfile(user_id=current_user.id)
        db.add(profile)

    profile.estimated_level = estimated_level
    profile.placement_score = total_score
    profile.placement_completed_at = datetime.utcnow()

    db.commit()

    return {
        "estimated_level": estimated_level,
        "total_score": total_score,
        "max_score": len(answers),
        "level_breakdown": {
            level: {
                "correct": level_scores[level],
                "total": level_totals[level],
                "accuracy": level_scores[level] / level_totals[level] if level_totals[level] > 0 else 0
            }
            for level in level_order
        }
    }
```

### 3.2 Enhanced Goal System

**File:** `backend/models.py`

Update `Goal` model:
```python
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
```

**File:** `backend/routers/users.py`

Add goal checking endpoint:
```python
@router.get("/daily-progress")
def get_daily_progress(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get today's progress against daily goals."""
    from datetime import date
    today = date.today()

    goal = db.query(models.Goal).filter(models.Goal.user_id == current_user.id).first()
    if not goal:
        goal = models.Goal(user_id=current_user.id)
        db.add(goal)
        db.commit()

    # Count today's activities
    today_reviews = db.query(models.PracticeReview).filter(
        models.PracticeReview.user_id == current_user.id,
        func.date(models.PracticeReview.timestamp) == today
    ).count()

    today_grammar = db.query(models.GrammarExerciseAttempt).filter(
        models.GrammarExerciseAttempt.user_id == current_user.id,
        func.date(models.GrammarExerciseAttempt.created_at) == today
    ).count()

    return {
        "date": str(today),
        "goals": {
            "cards_per_day": goal.cards_per_day,
            "grammar_exercises_per_day": goal.grammar_exercises_per_day,
        },
        "progress": {
            "cards_reviewed": today_reviews,
            "grammar_completed": today_grammar,
        },
        "completion": {
            "cards": min(100, int(today_reviews / goal.cards_per_day * 100)) if goal.cards_per_day else 100,
            "grammar": min(100, int(today_grammar / goal.grammar_exercises_per_day * 100)) if goal.grammar_exercises_per_day else 100,
        },
        "streak": {
            "current": goal.current_streak,
            "longest": goal.longest_streak,
            "freezes_available": goal.streak_freezes_available,
        }
    }
```

### 3.3 AI-Powered Recommendations

**File:** `backend/routers/recommendations.py` (NEW)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from services.auth import get_current_user
from services.database import get_db

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/")
def get_recommendations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate personalized recommendations based on:
    - Weak areas from analytics
    - Recent activity patterns
    - User's estimated level
    """
    recommendations = []

    # Get user profile
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()

    user_level = profile.estimated_level if profile else "A2"

    # Check for leeches
    leech_cards = db.query(models.Card).join(models.Deck).filter(
        models.Deck.user_id == current_user.id,
        models.Card.is_leech == True
    ).count()

    if leech_cards > 0:
        recommendations.append({
            "type": "warning",
            "priority": "high",
            "title": f"You have {leech_cards} difficult cards",
            "description": "Consider reviewing these cards with different mnemonics or breaking them down.",
            "action": {"type": "view_leeches"}
        })

    # Check weak grammar areas
    weak_grammar = db.query(
        models.GrammarExercise.grammar_point,
        func.avg(models.GrammarExercise.correct_attempts * 100.0 /
                 func.nullif(models.GrammarExercise.attempts, 0)).label("accuracy")
    ).join(models.GrammarExerciseSet).filter(
        models.GrammarExerciseSet.user_id == current_user.id,
        models.GrammarExercise.attempts > 2
    ).group_by(models.GrammarExercise.grammar_point).having(
        func.avg(models.GrammarExercise.correct_attempts * 100.0 /
                 func.nullif(models.GrammarExercise.attempts, 0)) < 60
    ).limit(3).all()

    for grammar_point, accuracy in weak_grammar:
        recommendations.append({
            "type": "practice",
            "priority": "medium",
            "title": f"Practice: {grammar_point}",
            "description": f"Your accuracy is {accuracy:.0f}%. More practice recommended.",
            "action": {"type": "grammar_practice", "grammar_point": grammar_point}
        })

    # Check if user has unwatched videos
    unwatched_videos = db.query(models.VideoContent).filter(
        models.VideoContent.user_id == current_user.id
    ).count()

    video_exercises_done = db.query(models.VideoExerciseAttempt).filter(
        models.VideoExerciseAttempt.user_id == current_user.id
    ).count()

    if unwatched_videos > 0 and video_exercises_done < unwatched_videos * 5:
        recommendations.append({
            "type": "suggestion",
            "priority": "low",
            "title": "Complete video exercises",
            "description": "You have video content with incomplete exercises.",
            "action": {"type": "video_practice"}
        })

    # Suggest based on level
    if user_level in ["A1", "A2"]:
        recommendations.append({
            "type": "tip",
            "priority": "low",
            "title": "Focus on vocabulary",
            "description": "At your level, building vocabulary is key. Aim for 10 new words daily.",
            "action": {"type": "add_vocabulary"}
        })
    elif user_level in ["B1", "B2"]:
        recommendations.append({
            "type": "tip",
            "priority": "low",
            "title": "Practice writing",
            "description": "Writing helps solidify grammar. Try the writing practice mode.",
            "action": {"type": "writing_practice"}
        })

    return {
        "user_level": user_level,
        "recommendations": sorted(recommendations, key=lambda x: {"high": 0, "medium": 1, "low": 2}[x["priority"]])
    }
```

### 3.4 Acceptance Criteria

- [ ] Diagnostic test generates 15 level-appropriate questions
- [ ] User level stored and used for recommendations
- [ ] Daily goals trackable separately from weekly
- [ ] Streak freezes work correctly
- [ ] Recommendations surface weak areas and leeches

---

## Phase 4: Community Features

**Goal:** Enable deck sharing and collaborative challenges.

### 4.1 Public Deck Model

**File:** `backend/models.py`

```python
class PublicDeck(Base):
    """Community-shared deck."""
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

    # Moderation
    status = Column(String(20), default="pending")  # pending, approved, rejected
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

    creator = relationship("User", foreign_keys=[creator_id])


class DeckRating(Base):
    """User rating for a public deck."""
    __tablename__ = "deck_ratings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deck_id = Column(UUID(as_uuid=True), ForeignKey("public_decks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    rating = Column(Integer, nullable=False)  # 1-5
    review = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        sqlalchemy.UniqueConstraint('deck_id', 'user_id', name='uq_deck_user_rating'),
    )
```

### 4.2 Challenge Model

**File:** `backend/models.py`

```python
class Challenge(Base):
    """Weekly/monthly learning challenge."""
    __tablename__ = "challenges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # null = system challenge

    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    challenge_type = Column(String(50), nullable=False)  # vocabulary, streak, grammar, time

    # Goals
    target_value = Column(Integer, nullable=False)  # e.g., 100 words, 7 day streak
    target_metric = Column(String(50), nullable=False)  # words_learned, streak_days, exercises_completed

    # Duration
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    # Participation
    is_public = Column(Boolean, default=True)
    max_participants = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    participants = relationship("ChallengeParticipant", back_populates="challenge")


class ChallengeParticipant(Base):
    """User participation in a challenge."""
    __tablename__ = "challenge_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    current_progress = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    joined_at = Column(DateTime, default=datetime.utcnow)

    challenge = relationship("Challenge", back_populates="participants")
    user = relationship("User")

    __table_args__ = (
        sqlalchemy.UniqueConstraint('challenge_id', 'user_id', name='uq_challenge_user'),
    )
```

### 4.3 Community Router

**File:** `backend/routers/community.py` (NEW)

```python
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from services.auth import get_current_user
from services.database import get_db

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/decks")
def browse_public_decks(
    language: str = Query(None),
    level: str = Query(None),
    sort: str = Query("popular"),  # popular, recent, rating
    limit: int = Query(20),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    """Browse community-shared decks."""
    query = db.query(models.PublicDeck).filter(models.PublicDeck.status == "approved")

    if language:
        query = query.filter(models.PublicDeck.language == language)
    if level:
        query = query.filter(models.PublicDeck.level == level)

    if sort == "popular":
        query = query.order_by(models.PublicDeck.downloads.desc())
    elif sort == "recent":
        query = query.order_by(models.PublicDeck.created_at.desc())
    elif sort == "rating":
        query = query.order_by(
            (models.PublicDeck.rating_sum / func.nullif(models.PublicDeck.rating_count, 0)).desc()
        )

    total = query.count()
    decks = query.offset(offset).limit(limit).all()

    return {
        "decks": decks,
        "total": total,
        "offset": offset,
        "limit": limit
    }


@router.post("/decks/{deck_id}/import")
def import_public_deck(
    deck_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import a public deck to user's collection."""
    public_deck = db.query(models.PublicDeck).filter(
        models.PublicDeck.id == deck_id,
        models.PublicDeck.status == "approved"
    ).first()

    if not public_deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    # Create new deck for user
    new_deck = models.Deck(
        user_id=current_user.id,
        name=f"{public_deck.name} (imported)",
        language=public_deck.language,
    )
    db.add(new_deck)
    db.flush()

    # Copy cards from original deck if it still exists
    if public_deck.original_deck_id:
        original_cards = db.query(models.Card).filter(
            models.Card.deck_id == public_deck.original_deck_id
        ).all()

        for card in original_cards:
            new_card = models.Card(
                deck_id=new_deck.id,
                front=card.front,
                back=card.back,
            )
            db.add(new_card)

    # Increment download count
    public_deck.downloads += 1

    db.commit()

    return {"ok": True, "new_deck_id": new_deck.id}


@router.get("/challenges")
def list_challenges(
    active_only: bool = Query(True),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List available challenges."""
    from datetime import datetime
    now = datetime.utcnow()

    query = db.query(models.Challenge).filter(models.Challenge.is_public == True)

    if active_only:
        query = query.filter(
            models.Challenge.start_date <= now,
            models.Challenge.end_date >= now
        )

    challenges = query.order_by(models.Challenge.end_date.asc()).all()

    # Add user's participation status
    result = []
    for challenge in challenges:
        participation = db.query(models.ChallengeParticipant).filter(
            models.ChallengeParticipant.challenge_id == challenge.id,
            models.ChallengeParticipant.user_id == current_user.id
        ).first()

        participant_count = db.query(models.ChallengeParticipant).filter(
            models.ChallengeParticipant.challenge_id == challenge.id
        ).count()

        result.append({
            "challenge": challenge,
            "participant_count": participant_count,
            "user_joined": participation is not None,
            "user_progress": participation.current_progress if participation else 0,
            "user_completed": participation.completed if participation else False
        })

    return {"challenges": result}


@router.post("/challenges/{challenge_id}/join")
def join_challenge(
    challenge_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join a challenge."""
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Check if already joined
    existing = db.query(models.ChallengeParticipant).filter(
        models.ChallengeParticipant.challenge_id == challenge_id,
        models.ChallengeParticipant.user_id == current_user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already joined this challenge")

    participant = models.ChallengeParticipant(
        challenge_id=challenge_id,
        user_id=current_user.id
    )
    db.add(participant)
    db.commit()

    return {"ok": True}
```

### 4.4 Acceptance Criteria

- [ ] Users can publish decks for community review
- [ ] Moderation queue for public decks
- [ ] Users can browse, filter, and import community decks
- [ ] Challenges track participant progress
- [ ] Leaderboard shows challenge rankings

---

## Migration Checklist

### Phase 1
- [ ] `migrations/phase1_telemetry.sql` - Add review telemetry fields
- [ ] Update `schemas.py` with new request/response models
- [ ] Update `srs.py` with leech detection
- [ ] Add `POST /practice/review` endpoint
- [ ] Update frontend hooks for timing capture

### Phase 2
- [ ] Create `routers/unified_practice.py`
- [ ] Add router to `main.py`
- [ ] Update `PracticeView.tsx` with mode selector
- [ ] Test mixed mode session generation

### Phase 3
- [ ] `migrations/phase3_personalization.sql` - Add UserProfile, update Goal
- [ ] Create `routers/diagnostic.py`
- [ ] Create `routers/recommendations.py`
- [ ] Add daily progress endpoint
- [ ] Frontend diagnostic flow

### Phase 4
- [ ] `migrations/phase4_community.sql` - PublicDeck, Challenge tables
- [ ] Create `routers/community.py`
- [ ] Frontend deck browser
- [ ] Frontend challenge UI

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SRS changes regress recall | A/B test new algorithm, keep toggle in settings |
| Leech threshold too aggressive | Start at 8, allow user adjustment |
| Diagnostic test inaccurate | Use as starting point only, allow manual override |
| Community decks have low quality | Require moderation before public listing |
| Challenge gaming | Rate-limit progress updates, require minimum quality |

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| 1 | Review telemetry capture rate | 100% of reviews |
| 1 | Leech detection accuracy | >80% of struggling cards flagged |
| 2 | Practice mode diversity | Users try 2+ modes per week |
| 3 | Diagnostic completion rate | >70% of new users |
| 3 | Daily goal completion | >60% of active users |
| 4 | Community deck imports | 10+ per week |

---

**Document Version:** 2.0
**Last Updated:** 2026-02-03
**Next Review:** After Phase 1 completion
