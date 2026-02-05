"""
Unified Practice Router

Orchestrates different practice modes (flashcards, grammar, video, writing)
into a cohesive learning experience. Leverages existing exercise systems
rather than rebuilding them.
"""

import logging
import random
from datetime import datetime, timezone
from typing import Literal, Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from services.auth import get_current_user
from services.database import get_db

logger = logging.getLogger("app.unified_practice")

router = APIRouter(prefix="/practice/unified", tags=["unified-practice"])

PracticeMode = Literal["flashcards", "grammar", "video", "writing", "mixed"]


@router.get("/session")
async def get_unified_session(
    mode: PracticeMode = Query("mixed", description="Practice mode to use"),
    deck_id: Optional[str] = Query(None, description="Specific deck to practice from"),
    limit: int = Query(20, ge=1, le=100, description="Maximum items in session"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a unified practice session mixing different exercise types.

    Modes:
    - flashcards: Traditional SRS card review
    - grammar: Grammar exercises from existing sets
    - video: Exercises from analyzed videos
    - writing: Writing prompts with AI feedback
    - mixed: Balanced mix of all available types

    The session intelligently combines:
    - Due flashcards (prioritized by SRS)
    - Incomplete grammar exercises (prioritized by attempts)
    - Video exercises from user's analyzed videos
    - Writing prompts based on recent vocabulary
    """
    session_items: List[Dict[str, Any]] = []

    # Calculate limits for mixed mode
    if mode == "mixed":
        flashcard_limit = max(1, limit // 4)
        grammar_limit = max(1, limit // 4)
        video_limit = max(1, limit // 4)
        writing_limit = 2
    else:
        flashcard_limit = limit
        grammar_limit = limit
        video_limit = limit
        writing_limit = limit

    # Fetch items based on mode
    if mode in ["flashcards", "mixed"]:
        cards = get_due_cards(db, current_user.id, deck_id, flashcard_limit)
        for card in cards:
            session_items.append({
                "type": "flashcard",
                "id": str(card.id),
                "data": {
                    "id": str(card.id),
                    "front": card.front,
                    "back": card.back,
                    "deck_id": str(card.deck_id),
                    "repetition": card.repetition,
                    "is_leech": card.is_leech or False,
                }
            })

    if mode in ["grammar", "mixed"]:
        exercises = get_pending_grammar_exercises(db, current_user.id, grammar_limit)
        for ex in exercises:
            session_items.append({
                "type": "grammar",
                "id": str(ex.id),
                "data": {
                    "id": str(ex.id),
                    "exercise_type": ex.exercise_type,
                    "question": ex.question,
                    "options": ex.options,
                    "grammar_point": ex.grammar_point,
                    "attempts": ex.attempts,
                }
            })

    if mode in ["video", "mixed"]:
        video_exercises = get_pending_video_exercises(db, current_user.id, video_limit)
        for vex in video_exercises:
            session_items.append({
                "type": "video",
                "id": f"{vex['video_id']}_{vex['exercise_type']}_{vex['index']}",
                "data": vex
            })

    if mode in ["writing", "mixed"]:
        prompts = generate_writing_prompts(db, current_user.id, writing_limit)
        for idx, prompt in enumerate(prompts):
            session_items.append({
                "type": "writing",
                "id": f"writing_{idx}",
                "data": prompt
            })

    # Shuffle for mixed mode to interleave different types
    if mode == "mixed":
        random.shuffle(session_items)

    # Create session record
    new_session = models.PracticeSession(
        user_id=current_user.id,
        session_type=mode,
        score=0
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    logger.info(f"Created unified session {new_session.id} with mode={mode}, items={len(session_items)}")

    return {
        "session_id": str(new_session.id),
        "mode": mode,
        "items": session_items,
        "total": len(session_items),
        "breakdown": {
            "flashcards": sum(1 for i in session_items if i["type"] == "flashcard"),
            "grammar": sum(1 for i in session_items if i["type"] == "grammar"),
            "video": sum(1 for i in session_items if i["type"] == "video"),
            "writing": sum(1 for i in session_items if i["type"] == "writing"),
        }
    }


@router.get("/available-modes")
async def get_available_modes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get information about which practice modes have content available.

    Returns counts for each mode so the UI can show/hide options appropriately.
    """
    now = datetime.now(timezone.utc)

    # Count due flashcards
    due_cards = (
        db.query(func.count(models.Card.id))
        .join(models.Deck)
        .filter(
            models.Deck.user_id == current_user.id,
            models.Card.next_review_date <= now
        )
        .scalar() or 0
    )

    # Count pending grammar exercises
    pending_grammar = (
        db.query(func.count(models.GrammarExercise.id))
        .join(models.GrammarExerciseSet)
        .filter(
            models.GrammarExerciseSet.user_id == current_user.id,
            models.GrammarExercise.correct_attempts < 2
        )
        .scalar() or 0
    )

    # Count video content
    video_count = (
        db.query(func.count(models.VideoContent.id))
        .filter(models.VideoContent.user_id == current_user.id)
        .scalar() or 0
    )

    # Count recent words for writing prompts
    word_count = (
        db.query(func.count(models.Word.id))
        .join(models.Deck)
        .filter(models.Deck.user_id == current_user.id)
        .scalar() or 0
    )

    return {
        "modes": {
            "flashcards": {
                "available": due_cards > 0,
                "count": due_cards,
                "description": "Review due vocabulary cards"
            },
            "grammar": {
                "available": pending_grammar > 0,
                "count": pending_grammar,
                "description": "Practice grammar exercises"
            },
            "video": {
                "available": video_count > 0,
                "count": video_count,
                "description": "Exercises from analyzed videos"
            },
            "writing": {
                "available": word_count >= 5,
                "count": word_count,
                "description": "Writing prompts using recent vocabulary"
            },
            "mixed": {
                "available": due_cards > 0 or pending_grammar > 0 or video_count > 0,
                "count": due_cards + pending_grammar,
                "description": "Balanced mix of all exercise types"
            }
        }
    }


def get_due_cards(
    db: Session,
    user_id: str,
    deck_id: Optional[str],
    limit: int
) -> List[models.Card]:
    """Fetch due flashcards prioritized by SRS schedule."""
    now = datetime.now(timezone.utc)

    query = (
        db.query(models.Card)
        .join(models.Deck)
        .filter(models.Deck.user_id == user_id)
    )

    if deck_id:
        query = query.filter(models.Card.deck_id == deck_id)

    # Get due cards first
    due_cards = (
        query
        .filter(models.Card.next_review_date <= now)
        .order_by(models.Card.next_review_date.asc())
        .limit(limit)
        .all()
    )

    # If not enough due cards, fill with upcoming cards (lowest EF first)
    if len(due_cards) < limit:
        needed = limit - len(due_cards)
        existing_ids = [c.id for c in due_cards]

        upcoming = (
            query
            .filter(
                models.Card.next_review_date > now,
                ~models.Card.id.in_(existing_ids) if existing_ids else True
            )
            .order_by(models.Card.easiness_factor.asc())
            .limit(needed)
            .all()
        )
        due_cards.extend(upcoming)

    return due_cards


def get_pending_grammar_exercises(
    db: Session,
    user_id: str,
    limit: int
) -> List[models.GrammarExercise]:
    """Fetch grammar exercises that haven't been mastered yet."""
    return (
        db.query(models.GrammarExercise)
        .join(models.GrammarExerciseSet)
        .filter(
            models.GrammarExerciseSet.user_id == user_id,
            models.GrammarExercise.correct_attempts < 2  # Not mastered yet
        )
        .order_by(
            models.GrammarExercise.attempts.asc(),  # Prioritize untried
            models.GrammarExercise.correct_attempts.asc()
        )
        .limit(limit)
        .all()
    )


def get_pending_video_exercises(
    db: Session,
    user_id: str,
    limit: int
) -> List[Dict[str, Any]]:
    """Fetch video exercises that user hasn't completed correctly."""
    videos = (
        db.query(models.VideoContent)
        .filter(models.VideoContent.user_id == user_id)
        .all()
    )

    exercises = []
    for video in videos:
        if not video.exercises:
            continue

        # Get completed exercise indices for this video
        completed = (
            db.query(
                models.VideoExerciseAttempt.exercise_type,
                models.VideoExerciseAttempt.question_index
            )
            .filter(
                models.VideoExerciseAttempt.video_id == video.id,
                models.VideoExerciseAttempt.user_id == user_id,
                models.VideoExerciseAttempt.is_correct == True
            )
            .all()
        )
        completed_set = {(t, i) for t, i in completed}

        # Check each exercise type
        for ex_type in ['comprehension', 'vocabulary', 'grammar']:
            if ex_type not in video.exercises:
                continue

            for idx, ex in enumerate(video.exercises[ex_type]):
                if (ex_type, idx) not in completed_set:
                    exercises.append({
                        "video_id": str(video.id),
                        "video_filename": video.filename,
                        "exercise_type": ex_type,
                        "index": idx,
                        "exercise": ex
                    })

                    if len(exercises) >= limit:
                        return exercises

    return exercises[:limit]


def generate_writing_prompts(
    db: Session,
    user_id: str,
    limit: int
) -> List[Dict[str, Any]]:
    """Generate contextual writing prompts from user's recent vocabulary."""
    # Get recent words
    recent_words = (
        db.query(models.Word)
        .join(models.Deck)
        .filter(models.Deck.user_id == user_id)
        .order_by(models.Word.last_reviewed_date.desc().nullslast())
        .limit(15)
        .all()
    )

    if len(recent_words) < 3:
        return []

    prompts = []

    # Prompt 1: Use specific vocabulary
    if len(recent_words) >= 5:
        word_terms = [w.term for w in recent_words[:5]]
        prompts.append({
            "type": "vocabulary_use",
            "prompt": f"Write 3-5 sentences using these words: {', '.join(word_terms)}",
            "target_words": word_terms,
            "min_words": 30,
            "max_words": 100,
            "instructions": "Try to use each word naturally in context."
        })

    # Prompt 2: Short story
    if len(recent_words) >= 8:
        story_words = [w.term for w in recent_words[5:10]]
        prompts.append({
            "type": "story",
            "prompt": f"Write a short story (50-100 words) incorporating: {', '.join(story_words)}",
            "target_words": story_words,
            "min_words": 50,
            "max_words": 150,
            "instructions": "Be creative! The story can be about anything."
        })

    # Prompt 3: Description
    if len(recent_words) >= 3:
        desc_words = [w.term for w in recent_words[:3]]
        prompts.append({
            "type": "description",
            "prompt": f"Describe your day using at least these words: {', '.join(desc_words)}",
            "target_words": desc_words,
            "min_words": 40,
            "max_words": 120,
            "instructions": "Write as if telling a friend about your day."
        })

    return prompts[:limit]


@router.post("/submit-answer")
async def submit_unified_answer(
    item_type: str = Query(..., description="Type: flashcard, grammar, video, writing"),
    item_id: str = Query(..., description="Item ID"),
    answer: str = Query(..., description="User's answer"),
    response_time_ms: Optional[int] = Query(None, description="Time taken"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit an answer for any item type in a unified session.

    Routes to the appropriate handler based on item_type.
    """
    if item_type == "flashcard":
        return await submit_flashcard_answer(db, current_user, item_id, answer, response_time_ms)
    elif item_type == "grammar":
        return await submit_grammar_answer(db, current_user, item_id, answer, response_time_ms)
    elif item_type == "video":
        return await submit_video_answer(db, current_user, item_id, answer, response_time_ms)
    elif item_type == "writing":
        return {"type": "writing", "message": "Writing submissions use /writing endpoints for AI feedback"}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown item type: {item_type}")


async def submit_flashcard_answer(
    db: Session,
    user: models.User,
    card_id: str,
    answer: str,
    response_time_ms: Optional[int]
):
    """Handle flashcard answer submission."""
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Quality is encoded in the answer (0-5)
    try:
        quality = int(answer)
        quality = max(0, min(5, quality))
    except ValueError:
        quality = 3  # Default to "correct with difficulty"

    from services.srs import update_card_after_review
    update_card_after_review(card, quality, response_time_ms)

    review = models.PracticeReview(
        user_id=user.id,
        card_id=card.id,
        quality=quality,
        response_time_ms=response_time_ms,
        is_correct=quality >= 3
    )
    db.add(review)
    db.commit()

    return {
        "type": "flashcard",
        "is_correct": quality >= 3,
        "next_review": card.next_review_date.isoformat(),
        "is_leech": card.is_leech or False
    }


async def submit_grammar_answer(
    db: Session,
    user: models.User,
    exercise_id: str,
    answer: str,
    response_time_ms: Optional[int]
):
    """Handle grammar exercise answer submission."""
    exercise = db.query(models.GrammarExercise).filter(
        models.GrammarExercise.id == exercise_id
    ).first()

    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # Check answer
    is_correct = answer.strip().lower() == exercise.correct_answer.strip().lower()

    # Update exercise stats
    exercise.attempts = (exercise.attempts or 0) + 1
    if is_correct:
        exercise.correct_attempts = (exercise.correct_attempts or 0) + 1
    exercise.last_attempted = datetime.utcnow()

    # Record attempt
    attempt = models.GrammarExerciseAttempt(
        user_id=user.id,
        exercise_id=exercise.id,
        user_answer=answer,
        is_correct=1 if is_correct else 0,
        time_spent_seconds=response_time_ms // 1000 if response_time_ms else None
    )
    db.add(attempt)
    db.commit()

    return {
        "type": "grammar",
        "is_correct": is_correct,
        "correct_answer": exercise.correct_answer,
        "explanation": exercise.explanation,
        "attempts": exercise.attempts,
        "correct_attempts": exercise.correct_attempts
    }


async def submit_video_answer(
    db: Session,
    user: models.User,
    item_id: str,
    answer: str,
    response_time_ms: Optional[int]
):
    """Handle video exercise answer submission."""
    # Parse item_id: video_id_exercise_type_index
    parts = item_id.split("_")
    if len(parts) < 3:
        raise HTTPException(status_code=400, detail="Invalid video exercise ID")

    video_id = parts[0]
    exercise_type = parts[1]
    try:
        question_index = int(parts[2])
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid question index")

    video = db.query(models.VideoContent).filter(
        models.VideoContent.id == video_id
    ).first()

    if not video or not video.exercises:
        raise HTTPException(status_code=404, detail="Video or exercises not found")

    if exercise_type not in video.exercises:
        raise HTTPException(status_code=404, detail="Exercise type not found")

    exercises = video.exercises[exercise_type]
    if question_index >= len(exercises):
        raise HTTPException(status_code=404, detail="Exercise not found")

    exercise = exercises[question_index]
    correct_answer = exercise.get("correct_answer", "")
    is_correct = answer.strip().lower() == correct_answer.strip().lower()

    # Record attempt
    attempt = models.VideoExerciseAttempt(
        user_id=user.id,
        video_id=video.id,
        exercise_type=exercise_type,
        question_index=question_index,
        user_answer=answer,
        is_correct=is_correct,
        time_spent_seconds=response_time_ms // 1000 if response_time_ms else None
    )
    db.add(attempt)
    db.commit()

    return {
        "type": "video",
        "is_correct": is_correct,
        "correct_answer": correct_answer,
        "explanation": exercise.get("explanation", "")
    }
