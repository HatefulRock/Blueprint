import logging
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from services.auth import get_current_user
from services.database import get_db
from services.card_service import CardService
from services.srs import update_card_after_review
import models
import schemas

# Setup logger
logger = logging.getLogger("app.words")

router = APIRouter(prefix="/words", tags=["words"])

# --- Helper Utilities ---

def get_deck_or_404(db: Session, deck_id: str, user_id: str):
    """Utility to verify deck existence and ownership using UUID strings."""
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()
    if not deck:
        logger.warning(f"Deck {deck_id} not found")
        raise HTTPException(status_code=404, detail="Deck not found")
    if str(deck.user_id) != str(user_id):
        logger.warning(f"Unauthorized access attempt to Deck {deck_id} by User {user_id}")
        raise HTTPException(status_code=403, detail="Access denied to this deck")
    return deck

# --- Flashcards Endpoints ---

@router.post("/cards", response_model=schemas.CardRead)
def create_card(
    card_in: schemas.CardCreate, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # card_in.deck_id is now a str (UUID)
    get_deck_or_404(db, card_in.deck_id, current_user.id)
    
    try:
        new_card = models.Card(**card_in.dict())
        db.add(new_card)
        db.commit()
        db.refresh(new_card)
        return new_card
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Failed to create card: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error during card creation")

@router.get("/cards/deck/{deck_id}", response_model=List[schemas.CardRead])
def get_cards_for_deck(
    deck_id: str, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_deck_or_404(db, deck_id, current_user.id)
    return db.query(models.Card).filter(models.Card.deck_id == deck_id).all()

@router.post("/cards/from_word/{word_id}", response_model=schemas.CardRead)
def create_card_from_word(
    word_id: str, 
    template_id: Optional[str] = None, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    get_deck_or_404(db, word.deck_id, current_user.id)

    try:
        new_card = CardService.create_card_from_word(db, word, template_id)
        db.add(new_card)
        db.commit()
        db.refresh(new_card)
        return new_card
    except Exception as e:
        db.rollback()
        logger.error(f"Template rendering failed for word {word_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to generate card: {str(e)}")

@router.post("/cards/from_deck/{deck_id}")
def enqueue_generate_deck_cards(
    deck_id: str, 
    template_id: Optional[str] = None, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_deck_or_404(db, deck_id, current_user.id)
    
    try:
        from ..workers.card_generator import enqueue_generate_cards_for_deck
        job_id = enqueue_generate_cards_for_deck(deck_id, template_id)
        logger.info(f"Enqueued card generation job {job_id} for deck {deck_id}")
        return {"job_id": job_id}
    except Exception as e:
        logger.error(f"Failed to enqueue job for deck {deck_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Background worker unavailable")

@router.post("/cards/bulk_from_words", response_model=List[schemas.CardRead])
def bulk_create_cards_from_word_ids(
    payload: schemas.BulkCardCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.word_ids:
        return []

    if payload.deck_id:
        get_deck_or_404(db, payload.deck_id, current_user.id)

    try:
        # CardService should be updated to expect list of UUID strings
        return CardService.bulk_create_cards_from_word_ids(
            db=db,
            word_ids=payload.word_ids,
            template_id=payload.template_id,
            deck_id_override=payload.deck_id,
            commit=True
        )
    except Exception as e:
        logger.error(f"Bulk creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Bulk creation failed")

@router.post("/cards/{card_id}/review", response_model=schemas.CardRead)
def review_card(
    card_id: str, 
    review: schemas.CardReviewRequest, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    get_deck_or_404(db, card.deck_id, current_user.id)

    try:
        # Update Card SRS logic
        update_card_after_review(card, int(review.rating))
        
        # Points
        quality = max(0, min(5, review.rating))
        current_user.points += (quality * 5)

        # Log History
        pr = models.PracticeReview(
            session_id=review.session_id if hasattr(review, 'session_id') else None,
            card_id=card.id,
            user_id=current_user.id,
            quality=quality,
        )
        db.add(pr)

        # Sync Word Familiarity
        if card.word_id:
            word = db.query(models.Word).filter(models.Word.id == card.word_id).first()
            if word:
                if quality >= 3:
                    word.familiarity_score = (word.familiarity_score or 0) + 1
                else:
                    word.familiarity_score = max(0, (word.familiarity_score or 0) - 1)
                
                word.last_reviewed_date = datetime.utcnow()
                days = max(1, (word.familiarity_score or 0) * 2)
                word.next_review_date = datetime.utcnow() + timedelta(days=days)

        db.commit()
        db.refresh(card)
        return card
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Review failed for card {card_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save review results")

@router.get("/decks", response_model=List[schemas.DeckRead])
def get_user_decks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all decks belonging to the current user.
    """
    try:
        # We use str(current_user.id) to ensure UUID compatibility
        decks = db.query(models.Deck).filter(
            models.Deck.user_id == str(current_user.id)
        ).all()
        
        logger.info(f"User {current_user.id} fetched {len(decks)} decks")
        return decks
    except SQLAlchemyError as e:
        logger.error(f"Failed to fetch decks for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database error while retrieving decks"
        )
    
# --- Word Endpoints ---

@router.get("/", response_model=List[schemas.WordRead])
def get_user_words(
    target_language: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all words from the user's word bank (across all their decks).
    Optionally filter by the deck's target language.
    """
    query = db.query(models.Word).join(models.Deck).filter(
        models.Deck.user_id == current_user.id
    )
    
    if target_language:
        query = query.filter(models.Deck.language == target_language)
        
    return query.all()

@router.post("/", response_model=schemas.WordRead)
def add_word(
    word_data: schemas.WordCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deck_id = word_data.deck_id
    if not deck_id:
        default_deck = db.query(models.Deck).filter(models.Deck.user_id == current_user.id).first()
        if not default_deck:
            try:
                # UUIDs are usually auto-generated by DB or model, no need to manually set ID here
                default_deck = models.Deck(user_id=current_user.id, name="My Vocabulary", language="Default")
                db.add(default_deck)
                db.commit()
                db.refresh(default_deck)
            except SQLAlchemyError:
                db.rollback()
                raise HTTPException(status_code=500, detail="Could not create default deck")
        deck_id = default_deck.id
    else:
        get_deck_or_404(db, deck_id, current_user.id)

    existing_word = db.query(models.Word).filter(
        models.Word.term == word_data.term, 
        models.Word.deck_id == deck_id
    ).first()
    
    if existing_word:
        return existing_word

    try:
        word_dict = word_data.dict()
        word_dict['deck_id'] = deck_id
        new_word = models.Word(**word_dict)
        db.add(new_word)
        db.commit()
        db.refresh(new_word)
        return new_word
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error adding word: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error while saving word")

@router.patch("/{word_id}")
def update_word(
    word_id: str,
    update_data: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    get_deck_or_404(db, word.deck_id, current_user.id)

    allowed_fields = ['deck_id', 'translation', 'context', 'part_of_speech',
                      'grammatical_breakdown', 'literal_translation', 'status']

    for field, value in update_data.items():
        if field in allowed_fields and hasattr(word, field):
            if field == 'deck_id':
                get_deck_or_404(db, value, current_user.id)
            setattr(word, field, value)

    try:
        db.commit()
        db.refresh(word)
        return word
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Update failed for word {word_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Update failed")

@router.delete("/{word_id}")
def delete_word(
    word_id: str, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    get_deck_or_404(db, word.deck_id, current_user.id)

    try:
        db.delete(word)
        db.commit()
        return {"message": "Word deleted", "id": word_id}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Delete operation failed")

# --- Templates & Decks ---

@router.post("/templates", response_model=schemas.CardTemplateRead)
def create_template(
    t_in: schemas.CardTemplateCreate, 
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        new_t = models.CardTemplate(**t_in.dict(), user_id=current_user.id)
        db.add(new_t)
        db.commit()
        db.refresh(new_t)
        return new_t
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Template creation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Template creation failed")

@router.get("/templates", response_model=List[schemas.CardTemplateRead])
def get_templates(
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Fetch global templates (user_id is None) and private ones."""
    return db.query(models.CardTemplate).filter(
        (models.CardTemplate.user_id == current_user.id) | 
        (models.CardTemplate.user_id == None)
    ).all()