from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from ..services.auth import get_current_user
from ..services.database import get_db
from ..services.card_service import CardService
from .. import models, schemas

router = APIRouter(prefix="/words", tags=["words"])

# --- Flashcards endpoints (Cards, Templates, Decks) ---
from fastapi import Body


def verify_deck_ownership(deck_id: int, user_id: int, db: Session):
    """Verify that a deck belongs to the current user."""
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if deck.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return deck


@router.post("/cards", response_model=schemas.CardRead)
def create_card(card: schemas.CardCreate, db: Session = Depends(get_db)):
    new_card = models.Card(**card.dict())
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card


@router.get("/cards/deck/{deck_id}", response_model=List[schemas.CardRead])
def get_cards_for_deck(deck_id: int, db: Session = Depends(get_db)):
    return db.query(models.Card).filter(models.Card.deck_id == deck_id).all()


@router.post("/cards/from_word/{word_id}", response_model=schemas.CardRead)
def create_card_from_word(
    word_id: int, template_id: int | None = None, db: Session = Depends(get_db)
):
    """Create a Card by rendering a template against an existing Word record using Jinja2."""
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    # Use CardService to create the card
    new_card = CardService.create_card_from_word(db, word, template_id)
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card


@router.post("/cards/from_deck/{deck_id}", response_model=List[schemas.CardRead])
def enqueue_generate_deck_cards(
    deck_id: int, template_id: int | None = None, db: Session = Depends(get_db)
):
    """Enqueue an asynchronous job to generate cards for a deck."""
    from ..workers.card_generator import enqueue_generate_cards_for_deck

    job_id = enqueue_generate_cards_for_deck(deck_id, template_id)
    return {"job_id": job_id}


def bulk_create_cards_from_deck(
    deck_id: int, template_id: int | None = None, db: Session = Depends(get_db)
):
    """Create cards for all words in a deck using the specified template (or default). Returns created cards."""
    # Use CardService to create cards for entire deck
    return CardService.bulk_create_cards_for_deck(db, deck_id, template_id, commit=True)


@router.post("/cards/bulk_from_words", response_model=List[schemas.CardRead])
def bulk_create_cards_from_word_ids(payload: dict, db: Session = Depends(get_db)):
    """Create cards for the provided list of word IDs using optional template and deck override.

    payload: { word_ids: [1,2,3], template_id: number|null, deck_id: number|null }
    """
    word_ids = payload.get("word_ids") or []
    template_id = payload.get("template_id")
    deck_id = payload.get("deck_id")

    if not word_ids:
        return []

    # Convert to integers
    word_ids = [int(wid) for wid in word_ids]
    template_id = int(template_id) if template_id else None

    # Use CardService to create cards (fixes N+1 query problem)
    return CardService.bulk_create_cards_from_word_ids(
        db=db,
        word_ids=word_ids,
        template_id=template_id,
        deck_id_override=deck_id,
        commit=True
    )


@router.post("/templates", response_model=schemas.CardTemplateRead)
def create_template(t: schemas.CardTemplateCreate, db: Session = Depends(get_db)):
    new_t = models.CardTemplate(**t.dict())
    db.add(new_t)
    db.commit()
    db.refresh(new_t)
    return new_t


@router.get("/templates/{user_id}", response_model=List[schemas.CardTemplateRead])
def get_templates(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.CardTemplate)
        .filter(
            (models.CardTemplate.user_id == user_id)
            | (models.CardTemplate.user_id == None)
        )
        .all()
    )


@router.get("/decks", response_model=List[schemas.DeckRead])
def get_user_decks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Deck).filter(models.Deck.user_id == current_user.id).all()


@router.get("/cards/due/{deck_id}", response_model=List[schemas.CardRead])
def get_due_cards(deck_id: int, db: Session = Depends(get_db)):
    from datetime import datetime

    now = datetime.utcnow()
    return (
        db.query(models.Card)
        .filter(models.Card.deck_id == deck_id, models.Card.next_review_date <= now)
        .all()
    )


@router.post("/cards/{card_id}/review", response_model=schemas.CardRead)
def review_card(
    card_id: int, review: schemas.CardReviewRequest, db: Session = Depends(get_db)
):
    """Review a card using the shared SRS helper (SM-2)."""
    from ..services.srs import update_card_after_review

    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Apply SRS helper
    update_card_after_review(card, int(review.rating))

    # Award points proportional to quality
    q = max(0, min(5, review.rating))
    user = (
        db.query(models.User)
        .join(models.Deck)
        .filter(models.Deck.id == card.deck_id)
        .first()
    )
    if user:
        user.points += q * 5

    # If session_id provided, create a PracticeReview record linked to the session
    session_id = None
    try:
        session_id = review.session_id
    except Exception:
        session_id = None

    try:
        pr = models.PracticeReview(
            session_id=session_id,
            card_id=card.id,
            user_id=user.id if user else 0,
            quality=q,
        )
        db.add(pr)
    except Exception:
        pass

    db.commit()
    db.refresh(card)

    # If this card links to a word, update the word's SRS / familiarity in parallel
    try:
        if card.word_id:
            w = db.query(models.Word).filter(models.Word.id == card.word_id).first()
            if w:
                # simple mapping: quality >=3 increments familiarity, else decrements
                if q >= 3:
                    w.familiarity_score = (w.familiarity_score or 0) + 1
                else:
                    w.familiarity_score = max(0, (w.familiarity_score or 0) - 1)
                w.last_reviewed_date = datetime.utcnow()
                # set next_review_date based on familiarity scoring (simple multiplier)
                days = max(1, (w.familiarity_score or 0) * 2)
                w.next_review_date = datetime.utcnow() + timedelta(days=days)
                db.add(w)
                db.commit()
    except Exception:
        pass

    return card


@router.post("/templates/init")
def init_default_templates(db: Session = Depends(get_db)):
    """Create some default card templates (global, user_id=NULL) if they don't exist."""
    defaults = [
        {
            "name": "Basic",
            "front_template": "{{term}}",
            "back_template": "{{translation}}\n\nContext: {{context}}",
        },
        {
            "name": "Cloze",
            "front_template": "{{cloze_text}}",
            "back_template": "{{full_text}}",
        },
    ]
    created = []
    for d in defaults:
        exists = (
            db.query(models.CardTemplate)
            .filter(
                models.CardTemplate.name == d["name"],
                models.CardTemplate.user_id == None,
            )
            .first()
        )
        if not exists:
            t = models.CardTemplate(
                user_id=None,
                name=d["name"],
                front_template=d["front_template"],
                back_template=d["back_template"],
            )
            db.add(t)
            db.commit()
            db.refresh(t)
            created.append(t.name)
    return {"created": created}


@router.post("/", response_model=schemas.WordRead)
def add_word(
    word_data: schemas.WordCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # If no deck_id provided, get or create user's default deck
    deck_id = word_data.deck_id
    if not deck_id:
        # Find user's first deck or create a default one
        default_deck = db.query(models.Deck).filter(
            models.Deck.user_id == current_user.id
        ).first()

        if not default_deck:
            # Create a default deck for the user
            default_deck = models.Deck(
                user_id=current_user.id,
                name="My Vocabulary",
                language="Default"
            )
            db.add(default_deck)
            db.commit()
            db.refresh(default_deck)

        deck_id = default_deck.id

    # Check if word already exists in this deck to avoid duplicates
    existing_word = (
        db.query(models.Word)
        .filter(
            models.Word.term == word_data.term, models.Word.deck_id == deck_id
        )
        .first()
    )

    if existing_word:
        return existing_word

    # Create the word with the determined deck_id
    word_dict = word_data.dict()
    word_dict['deck_id'] = deck_id
    new_word = models.Word(**word_dict)
    db.add(new_word)
    db.commit()
    db.refresh(new_word)
    return new_word


@router.get("/", response_model=List[schemas.WordRead])
def get_all_user_words(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all words across all decks for the current user."""
    # Get all deck IDs for the current user
    user_deck_ids = [deck.id for deck in db.query(models.Deck).filter(
        models.Deck.user_id == current_user.id
    ).all()]

    # Fetch all words from those decks
    if not user_deck_ids:
        return []

    return db.query(models.Word).filter(
        models.Word.deck_id.in_(user_deck_ids)
    ).all()


@router.get("/deck/{deck_id}", response_model=List[schemas.WordRead])
def get_words_by_deck(deck_id: int, db: Session = Depends(get_db)):
    return db.query(models.Word).filter(models.Word.deck_id == deck_id).all()


@router.get("/due/{deck_id}", response_model=List[schemas.WordRead])
def get_due_words(deck_id: int, db: Session = Depends(get_db)):
    """Fetch words that are ready for review based on SRS."""
    now = datetime.utcnow()
    return (
        db.query(models.Word)
        .filter(models.Word.deck_id == deck_id, models.Word.next_review_date <= now)
        .all()
    )


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
    user = (
        db.query(models.User)
        .join(models.Deck)
        .filter(models.Deck.id == word.deck_id)
        .first()
    )
    if user:
        user.points += rating * 5

    db.commit()
    return {"message": "SRS updated", "next_review": word.next_review_date}


@router.patch("/{word_id}")
def update_word(
    word_id: int,
    update_data: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update word properties (e.g., deck_id, translation, etc.)"""
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    # Update allowed fields
    allowed_fields = ['deck_id', 'translation', 'context', 'part_of_speech',
                      'grammatical_breakdown', 'literal_translation', 'status']

    for field, value in update_data.items():
        if field in allowed_fields and hasattr(word, field):
            setattr(word, field, value)

    db.commit()
    db.refresh(word)
    return word


@router.delete("/{word_id}")
def delete_word(word_id: int, db: Session = Depends(get_db)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    db.delete(word)
    db.commit()
    return {"message": "Word deleted"}


@router.post("/{word_id}/mark-known")
def mark_word_as_known(
    word_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark a word as already known (skip SRS, set max familiarity)."""
    word = db.query(models.Word).filter(models.Word.id == word_id).first()

    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    # Verify the word belongs to a deck owned by the current user
    deck = db.query(models.Deck).filter(models.Deck.id == word.deck_id).first()
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Mark word as known
    word.status = "learned"  # or "known" if you have that status
    word.familiarity_score = 10  # Max score
    word.last_reviewed_date = datetime.utcnow()
    word.next_review_date = datetime.utcnow() + timedelta(days=365)  # Review in a year

    db.commit()
    db.refresh(word)

    return {"success": True, "message": "Word marked as known", "word": word}


from fastapi import Body


@router.post("/decks")
def create_deck(
    payload: dict = Body(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    name = payload.get("name")
    language = payload.get("language")
    default_template_id = payload.get("default_template_id")
    new_deck = models.Deck(
        name=name,
        language=language,
        user_id=current_user.id,
        default_template_id=default_template_id
    )
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    return new_deck


@router.patch("/decks/{deck_id}")
def update_deck(
    deck_id: int,
    payload: dict = Body(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update deck properties like name, language, or default template."""
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    # Check ownership
    if deck.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this deck")

    # Update fields if provided
    if "name" in payload:
        deck.name = payload["name"]
    if "language" in payload:
        deck.language = payload["language"]
    if "default_template_id" in payload:
        deck.default_template_id = payload["default_template_id"]

    db.commit()
    db.refresh(deck)
    return deck
