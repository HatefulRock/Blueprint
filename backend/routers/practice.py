from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..models import Word
from ..services.database import get_db
from ..services.practice_generator import PracticeGenerator

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/generate/{deck_id}")
async def get_practice_session(deck_id: int, db: Session = Depends(get_db)):
    # 1. Get words from DB that belong to this deck and are due for review
    words = (
        db.query(Word)
        .filter(Word.deck_id == deck_id, Word.next_review_date <= datetime.utcnow())
        .all()
    )

    if not words:
        # Fallback: just get the weakest words if none are "due"
        words = (
            db.query(Word)
            .filter(Word.deck_id == deck_id)
            .order_by(Word.familiarity_score.asc())
            .limit(10)
            .all()
        )

    # 2. Convert SQLAlchemy objects to dicts for the AI
    words_data = [
        {"term": w.term, "translation": w.translation, "context": w.context}
        for w in words
    ]

    # 3. Call Gemini to make the quiz
    quiz = await PracticeGenerator.generate_quiz_from_words(words_data, "Chinese")

    return {"quiz": quiz}
