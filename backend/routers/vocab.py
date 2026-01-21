from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from ..services.database import get_db
from .. import models

router = APIRouter(prefix="/vocab", tags=["vocab"])


@router.post("/capture")
def capture_vocab(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """
    Capture a word from the reader with its context sentence and optional reading_content reference.
    Payload flexible to accept camelCase from frontend.
    """
    # Flexible keys
    term = payload.get("term") or payload.get("text")
    if not term:
        raise HTTPException(status_code=400, detail="term is required")

    deck_id = (
        payload.get("deck_id")
        or payload.get("deckId")
        or payload.get("deckId")
        or payload.get("deckId")
    )
    # Fallback default deck
    try:
        deck_id = int(deck_id) if deck_id is not None else 1
    except Exception:
        deck_id = 1

    context_sentence = (
        payload.get("context")
        or payload.get("sentence")
        or payload.get("contextSentence")
        or None
    )
    reading_content_id = (
        payload.get("reading_content_id") or payload.get("readingContentId") or None
    )
    analysis = payload.get("analysis") or payload.get("analysisResult") or {}
    translation = (
        payload.get("translation") or analysis.get("translation")
        if isinstance(analysis, dict)
        else None
    )
    part_of_speech = (
        payload.get("part_of_speech")
        or payload.get("partOfSpeech")
        or analysis.get("partOfSpeech")
        if isinstance(analysis, dict)
        else None
    )
    literal_translation = (
        payload.get("literal_translation")
        or payload.get("literalTranslation")
        or analysis.get("literalTranslation")
        if isinstance(analysis, dict)
        else None
    )

    # Check existing by term+deck
    existing = (
        db.query(models.Word)
        .filter(models.Word.term == term, models.Word.deck_id == deck_id)
        .first()
    )

    if existing:
        # Update lightweight fields
        existing.encounters = (existing.encounters or 0) + 1
        if existing.status == "new":
            existing.status = "seen"
        # update translation/pos if provided
        if translation:
            existing.translation = existing.translation or translation
        if part_of_speech:
            existing.part_of_speech = existing.part_of_speech or part_of_speech

        # Add context record if provided
        if context_sentence:
            wc = models.WordContext(
                word_id=existing.id,
                reading_content_id=reading_content_id,
                sentence=context_sentence,
            )
            db.add(wc)

        db.commit()
        db.refresh(existing)
        return {"action": "updated", "word": existing}

    # Create new word
    new_word = models.Word(
        deck_id=deck_id,
        term=term,
        context=context_sentence or "",
        translation=translation,
        part_of_speech=part_of_speech,
        literal_translation=literal_translation,
        reading_content_id=reading_content_id,
        encounters=1,
        status="seen",
    )
    db.add(new_word)
    db.commit()
    db.refresh(new_word)

    # create initial context row if sentence provided
    if context_sentence:
        wc = models.WordContext(
            word_id=new_word.id,
            reading_content_id=reading_content_id,
            sentence=context_sentence,
        )
        db.add(wc)
        db.commit()

    db.refresh(new_word)
    return {"action": "created", "word": new_word}
