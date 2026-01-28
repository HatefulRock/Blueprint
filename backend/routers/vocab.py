import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from ..services.auth import get_current_user
from ..services.database import get_db
from ..services.cache import cache, make_dict_key
from .. import models, schemas

# Setup logger
logger = logging.getLogger("app.vocab")

router = APIRouter(prefix="/vocab", tags=["vocab"])

# --- Helper ---

def verify_word_ownership(db: Session, word_id: str, user_id: str):
    """Ensure the word exists and belongs to a deck owned by the user."""
    word = db.query(models.Word).join(models.Deck).filter(
        models.Word.id == word_id,
        models.Deck.user_id == user_id
    ).first()
    
    if not word:
        logger.warning(f"Word {word_id} not found or unauthorized access by user {user_id}")
        raise HTTPException(status_code=404, detail="Word not found")
    return word

# --- Endpoints ---

@router.post("/capture", response_model=schemas.VocabCaptureResponse)
def capture_vocab(
    payload: schemas.VocabCaptureRequest, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Capture a word from the reader. 
    Handles UUIDs for deck_id and reading_content_id.
    """
    term = payload.term.strip() if payload.term else None
    if not term:
        raise HTTPException(status_code=400, detail="Term is required")

    # Resolve Deck ID (UUID)
    deck_id = payload.deck_id
    if not deck_id:
        # Find user's first deck or default
        default_deck = db.query(models.Deck).filter(models.Deck.user_id == current_user.id).first()
        if not default_deck:
            logger.error(f"User {current_user.id} has no decks to capture to.")
            raise HTTPException(status_code=400, detail="No deck available. Please create a deck first.")
        deck_id = default_deck.id
    else:
        # Verify ownership of provided deck_id
        deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.user_id == current_user.id).first()
        if not deck:
            raise HTTPException(status_code=403, detail="Unauthorized deck access")

    # Extraction logic for optional analysis fields
    analysis = payload.analysis or {}
    translation = analysis.get("translation")
    part_of_speech = analysis.get("partOfSpeech")
    literal_translation = analysis.get("literalTranslation")

    try:
        existing = db.query(models.Word).filter(
            models.Word.term == term, 
            models.Word.deck_id == deck_id
        ).first()

        if existing:
            # Update existing word
            existing.encounters = (existing.encounters or 0) + 1
            if existing.status == "new":
                existing.status = "seen"
            
            # Only update fields if they are currently empty
            if translation and not existing.translation:
                existing.translation = translation
            if part_of_speech and not existing.part_of_speech:
                existing.part_of_speech = part_of_speech

            if payload.context:
                wc = models.WordContext(
                    word_id=existing.id,
                    reading_content_id=payload.reading_content_id,
                    sentence=payload.context,
                )
                db.add(wc)

            db.commit()
            db.refresh(existing)
            action = "updated"
            word_result = existing
        else:
            # Create new word
            new_word = models.Word(
                deck_id=deck_id,
                term=term,
                context=payload.context or "",
                translation=translation,
                part_of_speech=part_of_speech,
                literal_translation=literal_translation,
                reading_content_id=payload.reading_content_id,
                encounters=1,
                status="seen",
            )
            db.add(new_word)
            db.flush() # Get ID for context

            if payload.context:
                wc = models.WordContext(
                    word_id=new_word.id,
                    reading_content_id=payload.reading_content_id,
                    sentence=payload.context,
                )
                db.add(wc)

            db.commit()
            db.refresh(new_word)
            action = "created"
            word_result = new_word

        # Invalidate dictionary cache
        try:
            cache_key = make_dict_key(term, "", None)
            cache.delete(cache_key)
        except Exception as ce:
            logger.warning(f"Cache invalidation failed for {term}: {str(ce)}")

        logger.info(f"Vocab {action}: '{term}' for user {current_user.id}")
        return {"action": action, "word": word_result}

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during vocab capture: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal database error")

@router.get("/{word_id}/detail", response_model=schemas.VocabWordDetailResponse)
def get_word_detail(
    word_id: str, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return word plus its contexts with UUID and ownership check."""
    word = verify_word_ownership(db, word_id, current_user.id)

    contexts = (
        db.query(models.WordContext)
        .filter(models.WordContext.word_id == word_id)
        .order_by(models.WordContext.created_at.desc())
        .all()
    )
    return {"word": word, "contexts": contexts}

@router.post("/{word_id}/invalidate_cache")
def invalidate_word_cache(
    word_id: str, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invalidate dictionary cache for a given word (by term)."""
    word = verify_word_ownership(db, word_id, current_user.id)

    try:
        key = make_dict_key(word.term, "", None)
        cache.delete(key)
        logger.info(f"Manual cache invalidation for term '{word.term}'")
        return {"ok": True}
    except Exception as e:
        logger.error(f"Cache invalidation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")