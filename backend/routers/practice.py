from datetime import datetime

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
import datetime

from .. import models
from ..models import Word
from ..services.database import get_db
from ..services.practice_generator import PracticeGenerator

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/generate/{deck_id}")
async def get_practice_session(deck_id: int, db: Session = Depends(get_db)):
    # existing quiz generator for AI-created practice
    words = (
        db.query(Word)
        .filter(Word.deck_id == deck_id, Word.next_review_date <= datetime.utcnow())
        .all()
    )

    if not words:
        words = (
            db.query(Word)
            .filter(Word.deck_id == deck_id)
            .order_by(Word.familiarity_score.asc())
            .limit(10)
            .all()
        )

    words_data = [
        {"term": w.term, "translation": w.translation, "context": w.context}
        for w in words
    ]

    quiz = await PracticeGenerator.generate_quiz_from_words(words_data, "Chinese")

    return {"quiz": quiz}


@router.post("/session")
def create_study_session(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Create a study session (server-curated queue) for flashcards.
    payload: {deck_id: int|null, user_id: int, limit: int}
    Returns list of Card objects ready for review ordered by priority.
    """
from sqlalchemy import asc
from datetime import datetime


    deck_id = payload.get("deck_id")
    user_id = payload.get("user_id")
    limit = int(payload.get("limit", 20))

    now = datetime.datetime.utcnow()

    query = db.query(models.Card)

    if deck_id is not None:
        query = query.filter(models.Card.deck_id == int(deck_id))
    else:
        # all decks for user
        query = query.join(models.Deck).filter(models.Deck.user_id == int(user_id))

    # Prefer due cards first
    due_cards = (
        query.filter(models.Card.next_review_date <= now)
        .order_by(models.Card.next_review_date.asc())
        .limit(limit)
        .all()
    )

    if len(due_cards) < limit:
        # Fill with cards with lowest easiness_factor and older last_reviewed_date
        needed = limit - len(due_cards)
        extras = (
            query.filter(models.Card.next_review_date > now)
            .order_by(
                models.Card.easiness_factor.asc(), models.Card.next_review_date.asc()
            )
            .limit(needed)
            .all()
        )
        cards = due_cards + extras
    else:
        cards = due_cards

    # Serialize minimal card info
    out = [
        {
            "id": c.id,
            "deck_id": c.deck_id,
            "front": c.front,
            "back": c.back,
            "repetition": c.repetition,
            "easiness_factor": c.easiness_factor,
            "interval": c.interval,
            "next_review_date": c.next_review_date.isoformat()
            if c.next_review_date
            else None,
            "last_reviewed_date": c.last_reviewed_date.isoformat()
            if c.last_reviewed_date
            else None,
        }
        for c in cards
    ]

    # Create a PracticeSession record for analytics
    try:
        session = models.PracticeSession(user_id=int(user_id) if user_id else 0, session_type="flashcards", score=0)
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
    except Exception:
        session_id = None

    return {"cards": out, "session_id": session_id}
