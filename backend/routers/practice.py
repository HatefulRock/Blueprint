import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from .. import models, schemas
from ..models import Word
from ..services.auth import get_current_user
from ..services.database import get_db
from ..services.practice_generator import PracticeGenerator

# Setup logger
logger = logging.getLogger("app.practice")

router = APIRouter(prefix="/practice", tags=["practice"])

# --- Helper ---

def verify_deck_ownership(db: Session, deck_id: str, user_id: str):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if str(deck.user_id) != str(user_id):
        logger.warning(f"User {user_id} attempted to access deck {deck_id} owned by {deck.user_id}")
        raise HTTPException(status_code=403, detail="Access denied to this deck")
    return deck

# --- Endpoints ---

@router.get("/generate/{deck_id}")
async def get_ai_practice_quiz(
    deck_id: str, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an AI-powered quiz from due words or low-familiarity words.
    """
    deck = verify_deck_ownership(db, deck_id, current_user.id)

    # 1. Fetch candidate words (due first, then low familiarity)
    now = datetime.now(timezone.utc)
    words = (
        db.query(Word)
        .filter(Word.deck_id == deck_id, Word.next_review_date <= now)
        .limit(15)
        .all()
    )

    if not words:
        logger.info(f"No due words for deck {deck_id}, falling back to low familiarity words.")
        words = (
            db.query(Word)
            .filter(Word.deck_id == deck_id)
            .order_by(Word.familiarity_score.asc())
            .limit(10)
            .all()
        )

    if not words:
        raise HTTPException(status_code=404, detail="No words found in this deck to practice.")

    words_data = [
        {"term": w.term, "translation": w.translation, "context": w.context}
        for w in words
    ]

    # 2. Call AI Generator
    try:
        logger.info(f"Generating AI quiz for user {current_user.id} on deck {deck_id}")
        quiz = await PracticeGenerator.generate_quiz_from_words(words_data, deck.language or "Target Language")
        return {"quiz": quiz}
    except Exception as e:
        logger.error(f"AI Practice Generator failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to generate AI quiz. Please try again later."
        )

@router.post("/session")
def create_study_session(
    payload: schemas.StudySessionRequest, # Using a proper schema
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a server-curated queue of flashcards for review.
    Returns cards prioritized by SRS due date.
    """
    deck_id = payload.deck_id
    limit = payload.limit or 20
    now = datetime.now(timezone.utc)

    # If deck_id is provided, verify it. If not, we query all user's decks.
    query = db.query(models.Card)
    if deck_id:
        verify_deck_ownership(db, deck_id, current_user.id)
        query = query.filter(models.Card.deck_id == deck_id)
    else:
        query = query.join(models.Deck).filter(models.Deck.user_id == current_user.id)

    try:
        # 1. Get Due Cards
        due_cards = (
            query.filter(models.Card.next_review_date <= now)
            .order_by(models.Card.next_review_date.asc())
            .limit(limit)
            .all()
        )

        # 2. If session isn't full, fill with upcoming cards (SRS 'Leaning' or 'Graduated' early)
        cards = due_cards
        if len(due_cards) < limit:
            needed = limit - len(due_cards)
            extras = (
                query.filter(models.Card.next_review_date > now)
                .order_by(models.Card.easiness_factor.asc(), models.Card.next_review_date.asc())
                .limit(needed)
                .all()
            )
            cards = due_cards + extras

        # 3. Create Session Record
        new_session = models.PracticeSession(
            user_id=current_user.id,
            session_type="flashcards",
            score=0
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        logger.info(f"Created practice session {new_session.id} for user {current_user.id}")

        return {
            "session_id": new_session.id,
            "cards": cards # FastAPI will use CardRead schema if configured
        }

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error creating practice session: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal database error")

@router.get("/sessions", response_model=Dict[str, Any])
def list_practice_sessions(
    limit: int = 20, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return recent practice sessions for the authenticated user."""
    try:
        sessions = (
            db.query(models.PracticeSession)
            .filter(models.PracticeSession.user_id == current_user.id)
            .order_by(models.PracticeSession.timestamp.desc())
            .limit(limit)
            .all()
        )

        return {
            "sessions": sessions,
            "count": len(sessions)
        }
    except SQLAlchemyError as e:
        logger.error(f"Error fetching sessions for {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch session history")

@router.patch("/session/{session_id}/score")
def update_session_score(
    session_id: str,
    score: int = Body(..., embed=True),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the final score of a practice session."""
    session = db.query(models.PracticeSession).filter(
        models.PracticeSession.id == session_id,
        models.PracticeSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        session.score = score
        db.commit()
        return {"ok": True}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update score")