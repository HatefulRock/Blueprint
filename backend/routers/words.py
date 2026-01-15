from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from ..services.database import get_db
from .. import models, schemas

router = APIRouter(prefix="/words", tags=["words"])

@router.post("/", response_model=schemas.WordRead)
def add_word(word_data: schemas.WordCreate, db: Session = Depends(get_db)):
    # Check if word already exists in this deck to avoid duplicates
    existing_word = db.query(models.Word).filter(
        models.Word.term == word_data.term,
        models.Word.deck_id == word_data.deck_id
    ).first()

    if existing_word:
        return existing_word

    new_word = models.Word(**word_data.dict())
    db.add(new_word)
    db.commit()
    db.refresh(new_word)
    return new_word

@router.get("/deck/{deck_id}", response_model=List[schemas.WordRead])
def get_words_by_deck(deck_id: int, db: Session = Depends(get_db)):
    return db.query(models.Word).filter(models.Word.deck_id == deck_id).all()

@router.get("/due/{deck_id}", response_model=List[schemas.WordRead])
def get_due_words(deck_id: int, db: Session = Depends(get_db)):
    """Fetch words that are ready for review based on SRS."""
    now = datetime.utcnow()
    return db.query(models.Word).filter(
        models.Word.deck_id == deck_id,
        models.Word.next_review_date <= now
    ).all()

@router.patch("/{word_id}/review")
def review_word(word_id: int, rating: int, db: Session = Depends(get_db)):
    """
    Updates SRS data based on user performance.
    rating: 1 (forgot), 2 (struggled), 3 (remembered), 4 (easy)
    """
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    # Simple SRS Logic (Modified SM-2)
    # Increase interval based on rating
    if rating >= 3:
        # User remembered word
        days_to_add = (word.familiarity_score + 1) * rating
        word.familiarity_score += 1
    else:
        # User forgot word
        days_to_add = 1
        word.familiarity_score = max(0, word.familiarity_score - 1)

    word.last_reviewed_date = datetime.utcnow()
    word.next_review_date = datetime.utcnow() + timedelta(days=days_to_add)

    # Also award points to the user
    user = db.query(models.User).join(models.Deck).filter(models.Deck.id == word.deck_id).first()
    if user:
        user.points += (rating * 5)

    db.commit()
    return {"message": "SRS updated", "next_review": word.next_review_date}

@router.delete("/{word_id}")
def delete_word(word_id: int, db: Session = Depends(get_db)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    db.delete(word)
    db.commit()
    return {"message": "Word deleted"}

@router.post("/decks")
def create_deck(name: str, language: str, user_id: int, db: Session = Depends(get_db)):
    new_deck = models.Deck(name=name, language=language, user_id=user_id)
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    return new_deck

@router.get("/decks/{user_id}")
def get_user_decks(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Deck).filter(models.Deck.user_id == user_id).all()
