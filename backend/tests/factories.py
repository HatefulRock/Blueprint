from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session
import models 

def create_practice_session(db: Session, user: models.User, score: int = 80) -> models.PracticeSession:
    """Helper to create a practice session."""
    session = models.PracticeSession(
        id=uuid4(),
        user_id=user.id,
        session_type="flashcards",
        score=score,
        timestamp=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def create_practice_review(
    db: Session,
    user: models.User,
    card: models.Card,
    quality: int = 4,
    response_time_ms: int = 2000
) -> models.PracticeReview:
    """Helper to create a practice review."""
    review = models.PracticeReview(
        id=uuid4(),
        user_id=user.id,
        card_id=card.id,
        quality=quality,
        response_time_ms=response_time_ms,
        is_correct=quality >= 3,
        timestamp=datetime.utcnow(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review