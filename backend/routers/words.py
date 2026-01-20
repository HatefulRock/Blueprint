from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from ..services.database import get_db
from .. import models, schemas

router = APIRouter(prefix="/words", tags=["words"])

# --- Flashcards endpoints (Cards, Templates, Decks) ---
from fastapi import Body


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
    from jinja2 import Template

    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")

    template = None
    if template_id:
        template = (
            db.query(models.CardTemplate)
            .filter(models.CardTemplate.id == template_id)
            .first()
        )
    if not template:
        # fallback to a global Basic template
        template = (
            db.query(models.CardTemplate)
            .filter(
                models.CardTemplate.name == "Basic", models.CardTemplate.user_id == None
            )
            .first()
        )

    context = {
        "term": word.term,
        "translation": word.translation,
        "context": word.context,
        "part_of_speech": word.part_of_speech,
        "literal_translation": word.literal_translation,
    }

    front = (
        Template(template.front_template).render(**context) if template else word.term
    )
    back = (
        Template(template.back_template).render(**context)
        if template
        else (word.translation or "")
    )

    new_card = models.Card(
        deck_id=word.deck_id,
        template_id=template.id if template else None,
        front=front,
        back=back,
    )
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card


@router.post("/cards/from_deck/{deck_id}", response_model=List[schemas.CardRead])
def bulk_create_cards_from_deck(
    deck_id: int, template_id: int | None = None, db: Session = Depends(get_db)
):
    """Create cards for all words in a deck using the specified template (or default). Returns created cards."""
    from jinja2 import Template

    words = db.query(models.Word).filter(models.Word.deck_id == deck_id).all()
    if not words:
        return []

    template = None
    if template_id:
        template = (
            db.query(models.CardTemplate)
            .filter(models.CardTemplate.id == template_id)
            .first()
        )
    if not template:
        template = (
            db.query(models.CardTemplate)
            .filter(
                models.CardTemplate.name == "Basic", models.CardTemplate.user_id == None
            )
            .first()
        )

    created = []
    for w in words:
        context = {
            "term": w.term,
            "translation": w.translation,
            "context": w.context,
            "part_of_speech": w.part_of_speech,
            "literal_translation": w.literal_translation,
        }
        front = (
            Template(template.front_template).render(**context) if template else w.term
        )
        back = (
            Template(template.back_template).render(**context)
            if template
            else (w.translation or "")
        )
        card = models.Card(
            deck_id=deck_id,
            template_id=template.id if template else None,
            front=front,
            back=back,
        )
        db.add(card)
        created.append(card)

    db.commit()
    # refresh created cards
    for c in created:
        db.refresh(c)
    return created


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


@router.get("/decks/{user_id}", response_model=List[schemas.DeckRead])
def get_user_decks(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Deck).filter(models.Deck.user_id == user_id).all()


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
def add_word(word_data: schemas.WordCreate, db: Session = Depends(get_db)):
    # Check if word already exists in this deck to avoid duplicates
    existing_word = (
        db.query(models.Word)
        .filter(
            models.Word.term == word_data.term, models.Word.deck_id == word_data.deck_id
        )
        .first()
    )

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


@router.delete("/{word_id}")
def delete_word(word_id: int, db: Session = Depends(get_db)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    db.delete(word)
    db.commit()
    return {"message": "Word deleted"}


from fastapi import Body


@router.post("/decks")
def create_deck(payload: dict = Body(...), db: Session = Depends(get_db)):
    name = payload.get("name")
    language = payload.get("language")
    user_id = payload.get("user_id", 1)
    new_deck = models.Deck(name=name, language=language, user_id=user_id)
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    return new_deck


@router.get("/decks/{user_id}")
def get_user_decks(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Deck).filter(models.Deck.user_id == user_id).all()
