from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..services.database import get_db
from .. import models, schemas
from ..services.cache import cache, make_dict_key

router = APIRouter(prefix="/vocab", tags=["vocab"])


@router.post("/capture", response_model=schemas.VocabCaptureResponse)
def capture_vocab(payload: schemas.VocabCaptureRequest, db: Session = Depends(get_db)):
    """
    Capture a word from the reader with its context sentence and optional reading_content reference.
    Validated via Pydantic `VocabCaptureRequest`.
    """
    term = payload.term
    if not term:
        raise HTTPException(status_code=400, detail="term is required")

    deck_id = payload.deck_id or 1
    context_sentence = payload.context
    reading_content_id = payload.reading_content_id
    analysis = payload.analysis or {}
    translation = analysis.get("translation") if isinstance(analysis, dict) else None
    part_of_speech = (
        analysis.get("partOfSpeech") if isinstance(analysis, dict) else None
    )
    literal_translation = (
        analysis.get("literalTranslation") if isinstance(analysis, dict) else None
    )

    existing = (
        db.query(models.Word)
        .filter(models.Word.term == term, models.Word.deck_id == deck_id)
        .first()
    )

    if existing:
        existing.encounters = (existing.encounters or 0) + 1
        if existing.status == "new":
            existing.status = "seen"
        if translation:
            existing.translation = existing.translation or translation
        if part_of_speech:
            existing.part_of_speech = existing.part_of_speech or part_of_speech

        if context_sentence:
            wc = models.WordContext(
                word_id=existing.id,
                reading_content_id=reading_content_id,
                sentence=context_sentence,
            )
            db.add(wc)

        db.commit()
        db.refresh(existing)

        # Invalidate dictionary cache for this term to ensure subsequent lookups reflect updates
        try:
            key = make_dict_key(term, "", None)
            cache.delete(key)
        except Exception:
            pass

        return {"action": "updated", "word": existing}

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

    if context_sentence:
        wc = models.WordContext(
            word_id=new_word.id,
            reading_content_id=reading_content_id,
            sentence=context_sentence,
        )
        db.add(wc)
        db.commit()

    # Invalidate dictionary cache for this term after creation
    try:
        key = make_dict_key(term, "", None)
        cache.delete(key)
    except Exception:
        pass

    db.refresh(new_word)
    return {"action": "created", "word": new_word}


@router.get("/{word_id}/detail", response_model=schemas.VocabWordDetailResponse)
def get_word_detail(word_id: int, db: Session = Depends(get_db)):
    """Return word plus its contexts."""
    w = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Word not found")

    contexts = (
        db.query(models.WordContext)
        .filter(models.WordContext.word_id == word_id)
        .order_by(models.WordContext.created_at.desc())
        .all()
    )
    return {"word": w, "contexts": contexts}


@router.post("/{word_id}/invalidate_cache")
def invalidate_word_cache(word_id: int, db: Session = Depends(get_db)):
    """Invalidate dictionary cache for a given word (by term)."""
    w = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Word not found")

    try:
        key = make_dict_key(w.term, "", None)
        cache.delete(key)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
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
