import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

import models
import schemas
from models import Word
from services.auth import get_current_user
from services.database import get_db
from services.practice_generator import PracticeGenerator

# Setup logger
logger = logging.getLogger("app.practice")

router = APIRouter(prefix="/practice", tags=["practice"])

# --- Helper ---

def to_uuid(value) -> UUID:
    """Convert string or UUID to UUID object."""
    if isinstance(value, UUID):
        return value
    return UUID(str(value))

def verify_deck_ownership(db: Session, deck_id, user_id):
    deck_uuid = to_uuid(deck_id)
    deck = db.query(models.Deck).filter(models.Deck.id == deck_uuid).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if deck.user_id != to_uuid(user_id):
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
    deck_uuid = to_uuid(deck_id)

    # 1. Fetch candidate words (due first, then low familiarity)
    now = datetime.now(timezone.utc)
    words = (
        db.query(Word)
        .filter(Word.deck_id == deck_uuid, Word.next_review_date <= now)
        .limit(15)
        .all()
    )

    if not words:
        logger.info(f"No due words for deck {deck_id}, falling back to low familiarity words.")
        words = (
            db.query(Word)
            .filter(Word.deck_id == deck_uuid)
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
        deck_uuid = to_uuid(deck_id)
        query = query.filter(models.Card.deck_id == deck_uuid)
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
            "sessions": [
                {
                    "id": str(s.id),
                    "session_type": s.session_type,
                    "language": s.language,
                    "score": s.score,
                    "timestamp": s.timestamp.isoformat() if s.timestamp else None,
                }
                for s in sessions
            ],
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
    session_uuid = to_uuid(session_id)
    session = db.query(models.PracticeSession).filter(
        models.PracticeSession.id == session_uuid,
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


@router.post("/review", response_model=schemas.ReviewResponse)
def submit_review(
    payload: schemas.ReviewSubmission,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a single card review with full telemetry.

    This endpoint captures enhanced review data including:
    - Response time (how long user took to answer)
    - Confidence rating (user's self-assessment)
    - Answer text (what user entered)

    The SRS algorithm uses this data to:
    - Update card scheduling with SM-2
    - Detect and flag "leech" cards (cards with 8+ failures)
    - Give bonus intervals for fast correct answers

    Args:
        payload: ReviewSubmission with card_id, quality (0-5), and optional telemetry

    Returns:
        ReviewResponse with next review date and leech status
    """
    # Find the card
    card = db.query(models.Card).filter(models.Card.id == payload.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Verify ownership through deck
    deck = db.query(models.Deck).filter(models.Deck.id == card.deck_id).first()
    if not deck or str(deck.user_id) != str(current_user.id):
        logger.warning(f"User {current_user.id} attempted to review card {payload.card_id} they don't own")
        raise HTTPException(status_code=403, detail="Access denied to this card")

    try:
        # Update card via enhanced SRS
        from services.srs import update_card_after_review
        update_card_after_review(card, payload.quality, payload.response_time_ms)

        # Create review record with telemetry
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

        logger.info(f"Review submitted: card={card.id}, quality={payload.quality}, leech={card.is_leech}")

        return schemas.ReviewResponse(
            ok=True,
            next_review_date=card.next_review_date,
            is_leech=card.is_leech or False,
            lapses=card.lapses or 0,
            total_reviews=card.total_reviews or 0
        )

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error submitting review: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit review")


@router.get("/leeches")
def get_leech_cards(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all cards flagged as leeches (difficult cards with 8+ failures).

    Leeches are cards that the user repeatedly fails. These should be
    reviewed with different strategies (mnemonics, breaking down, etc.)
    """
    leech_cards = (
        db.query(models.Card)
        .join(models.Deck)
        .filter(
            models.Deck.user_id == current_user.id,
            models.Card.is_leech == True
        )
        .order_by(models.Card.lapses.desc())
        .all()
    )

    return {
        "count": len(leech_cards),
        "cards": [
            {
                "id": card.id,
                "front": card.front,
                "back": card.back,
                "lapses": card.lapses,
                "total_reviews": card.total_reviews,
                "deck_id": card.deck_id,
            }
            for card in leech_cards
        ]
    }


@router.post("/leeches/{card_id}/reset")
def reset_leech(
    card_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reset a card's leech status after user has addressed the problem.

    Use this after modifying the card (adding mnemonics, simplifying, etc.)
    to give it a fresh start.
    """
    card_uuid = to_uuid(card_id)
    card = db.query(models.Card).filter(models.Card.id == card_uuid).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Verify ownership
    deck = db.query(models.Deck).filter(models.Deck.id == card.deck_id).first()
    if not deck or deck.user_id != to_uuid(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        from services.srs import reset_leech_status
        reset_leech_status(card)
        db.commit()
        return {"ok": True, "message": "Leech status reset"}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to reset leech status")