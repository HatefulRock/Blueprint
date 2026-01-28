from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from typing import Optional, List

from services.database import get_db
from services.auth import get_current_user
import models

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/practice")
def practice_stats(
    user_id: int = Query(..., description="User id"),
    date_from: Optional[str] = Query(None, description="ISO date string, inclusive"),
    date_to: Optional[str] = Query(None, description="ISO date string, inclusive"),
    db: Session = Depends(get_db),
):
    """Return practice analytics for a user between optional date range.
    Response includes total sessions, total reviews, average quality, daily breakdown, and top reviewed cards.
    """
    try:
        to_dt = datetime.fromisoformat(date_to) if date_to else datetime.utcnow()
    except Exception:
        to_dt = datetime.utcnow()
    try:
        from_dt = (
            datetime.fromisoformat(date_from)
            if date_from
            else (to_dt - timedelta(days=30))
        )
    except Exception:
        from_dt = to_dt - timedelta(days=30)

    # Total sessions
    total_sessions = (
        db.query(func.count(models.PracticeSession.id))
        .filter(models.PracticeSession.user_id == user_id)
        .filter(models.PracticeSession.timestamp >= from_dt)
        .filter(models.PracticeSession.timestamp <= to_dt)
        .scalar()
    )

    # Total reviews and average quality
    total_reviews = (
        db.query(func.count(models.PracticeReview.id))
        .filter(models.PracticeReview.user_id == user_id)
        .filter(models.PracticeReview.timestamp >= from_dt)
        .filter(models.PracticeReview.timestamp <= to_dt)
        .scalar()
    )

    avg_quality = (
        db.query(func.avg(models.PracticeReview.quality))
        .filter(models.PracticeReview.user_id == user_id)
        .filter(models.PracticeReview.timestamp >= from_dt)
        .filter(models.PracticeReview.timestamp <= to_dt)
        .scalar()
    )
    try:
        avg_quality = float(avg_quality) if avg_quality is not None else None
    except Exception:
        avg_quality = None

    # Daily breakdown: date, count, avg_quality
    daily = (
        db.query(
            func.date(models.PracticeReview.timestamp).label("day"),
            func.count(models.PracticeReview.id).label("count"),
            func.avg(models.PracticeReview.quality).label("avg_quality"),
        )
        .filter(models.PracticeReview.user_id == user_id)
        .filter(models.PracticeReview.timestamp >= from_dt)
        .filter(models.PracticeReview.timestamp <= to_dt)
        .group_by(func.date(models.PracticeReview.timestamp))
        .order_by(func.date(models.PracticeReview.timestamp))
        .all()
    )

    daily_breakdown = [
        {
            "date": row[0],
            "count": int(row[1]),
            "avg_quality": float(row[2]) if row[2] is not None else None,
        }
        for row in daily
    ]

    # Top reviewed cards
    top_cards = (
        db.query(
            models.PracticeReview.card_id,
            func.count(models.PracticeReview.id).label("cnt"),
        )
        .filter(models.PracticeReview.user_id == user_id)
        .filter(models.PracticeReview.timestamp >= from_dt)
        .filter(models.PracticeReview.timestamp <= to_dt)
        .group_by(models.PracticeReview.card_id)
        .order_by(desc("cnt"))
        .limit(10)
        .all()
    )

    top_cards_out = []
    for card_id, cnt in top_cards:
        card = db.query(models.Card).filter(models.Card.id == card_id).first()
        if card:
            top_cards_out.append(
                {
                    "card_id": card_id,
                    "count": int(cnt),
                    "front": card.front,
                    "back": card.back,
                }
            )

    return {
        "user_id": user_id,
        "from": from_dt.isoformat(),
        "to": to_dt.isoformat(),
        "total_sessions": int(total_sessions or 0),
        "total_reviews": int(total_reviews or 0),
        "average_quality": avg_quality,
        "daily_breakdown": daily_breakdown,
        "top_cards": top_cards_out,
    }


@router.get("/progress")
def get_progress_insights(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, description="Number of days to analyze"),
):
    """
    Get comprehensive progress insights including:
    - Daily vocabulary progress
    - Practice session trends
    - Grammar exercise performance
    - Overall learning trajectory
    """
    from_dt = datetime.utcnow() - timedelta(days=days)
    to_dt = datetime.utcnow()

    # Daily vocabulary additions
    daily_words = (
        db.query(
            func.date(models.Word.last_reviewed_date).label("date"),
            func.count(models.Word.id).label("words_reviewed"),
        )
        .filter(models.Word.deck_id.in_(
            db.query(models.Deck.id).filter(models.Deck.user_id == current_user.id)
        ))
        .filter(models.Word.last_reviewed_date >= from_dt)
        .filter(models.Word.last_reviewed_date <= to_dt)
        .group_by(func.date(models.Word.last_reviewed_date))
        .order_by(func.date(models.Word.last_reviewed_date))
        .all()
    )

    # Daily practice sessions
    daily_sessions = (
        db.query(
            func.date(models.PracticeSession.timestamp).label("date"),
            func.count(models.PracticeSession.id).label("sessions"),
            func.avg(models.PracticeSession.score).label("avg_score"),
        )
        .filter(models.PracticeSession.user_id == current_user.id)
        .filter(models.PracticeSession.timestamp >= from_dt)
        .filter(models.PracticeSession.timestamp <= to_dt)
        .group_by(func.date(models.PracticeSession.timestamp))
        .order_by(func.date(models.PracticeSession.timestamp))
        .all()
    )

    # Grammar exercise performance over time
    daily_grammar = (
        db.query(
            func.date(models.GrammarExerciseAttempt.created_at).label("date"),
            func.count(models.GrammarExerciseAttempt.id).label("attempts"),
            func.sum(models.GrammarExerciseAttempt.is_correct).label("correct"),
        )
        .filter(models.GrammarExerciseAttempt.user_id == current_user.id)
        .filter(models.GrammarExerciseAttempt.created_at >= from_dt)
        .filter(models.GrammarExerciseAttempt.created_at <= to_dt)
        .group_by(func.date(models.GrammarExerciseAttempt.created_at))
        .order_by(func.date(models.GrammarExerciseAttempt.created_at))
        .all()
    )

    # Total statistics
    total_words = (
        db.query(func.count(models.Word.id))
        .filter(models.Word.deck_id.in_(
            db.query(models.Deck.id).filter(models.Deck.user_id == current_user.id)
        ))
        .scalar() or 0
    )

    total_practice_sessions = (
        db.query(func.count(models.PracticeSession.id))
        .filter(models.PracticeSession.user_id == current_user.id)
        .scalar() or 0
    )

    total_grammar_attempts = (
        db.query(func.count(models.GrammarExerciseAttempt.id))
        .filter(models.GrammarExerciseAttempt.user_id == current_user.id)
        .scalar() or 0
    )

    return {
        "date_range": {
            "from": from_dt.isoformat(),
            "to": to_dt.isoformat(),
            "days": days,
        },
        "vocabulary_progress": [
            {
                "date": str(row[0]),
                "words_reviewed": int(row[1]),
            }
            for row in daily_words
        ],
        "practice_progress": [
            {
                "date": str(row[0]),
                "sessions": int(row[1]),
                "avg_score": float(row[2]) if row[2] else 0,
            }
            for row in daily_sessions
        ],
        "grammar_progress": [
            {
                "date": str(row[0]),
                "attempts": int(row[1]),
                "correct": int(row[2]),
                "accuracy": (float(row[2]) / float(row[1]) * 100) if row[1] > 0 else 0,
            }
            for row in daily_grammar
        ],
        "totals": {
            "total_words": int(total_words),
            "total_practice_sessions": int(total_practice_sessions),
            "total_grammar_attempts": int(total_grammar_attempts),
        },
    }


@router.get("/weak-areas")
def get_weak_areas(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Identify weak areas in user's learning:
    - Words with low familiarity scores
    - Grammar points with low accuracy
    - Exercise types that need more practice
    """
    # Weak vocabulary (low familiarity, multiple reviews)
    weak_words = (
        db.query(models.Word)
        .filter(models.Word.deck_id.in_(
            db.query(models.Deck.id).filter(models.Deck.user_id == current_user.id)
        ))
        .filter(models.Word.familiarity_score < 3)
        .filter(models.Word.last_reviewed_date.isnot(None))
        .order_by(models.Word.familiarity_score.asc())
        .limit(20)
        .all()
    )

    # Grammar exercises with low success rate
    grammar_weak = (
        db.query(
            models.GrammarExercise.grammar_point,
            models.GrammarExercise.exercise_type,
            func.count(models.GrammarExercise.id).label("total_exercises"),
            func.sum(models.GrammarExercise.correct_attempts).label("total_correct"),
            func.sum(models.GrammarExercise.attempts).label("total_attempts"),
        )
        .join(models.GrammarExerciseSet)
        .filter(models.GrammarExerciseSet.user_id == current_user.id)
        .filter(models.GrammarExercise.attempts > 0)
        .group_by(
            models.GrammarExercise.grammar_point,
            models.GrammarExercise.exercise_type,
        )
        .all()
    )

    # Calculate accuracy for each grammar point
    grammar_analysis = []
    for row in grammar_weak:
        grammar_point, exercise_type, total_ex, total_correct, total_attempts = row
        accuracy = (float(total_correct or 0) / float(total_attempts or 1)) * 100

        if accuracy < 70:  # Consider below 70% as weak
            grammar_analysis.append({
                "grammar_point": grammar_point,
                "exercise_type": exercise_type,
                "total_exercises": int(total_ex or 0),
                "total_correct": int(total_correct or 0),
                "total_attempts": int(total_attempts or 0),
                "accuracy": round(accuracy, 1),
            })

    # Sort by accuracy (lowest first)
    grammar_analysis.sort(key=lambda x: x["accuracy"])

    # Cards that are frequently reviewed but still difficult
    struggling_cards = (
        db.query(
            models.Card,
            func.count(models.PracticeReview.id).label("review_count"),
            func.avg(models.PracticeReview.quality).label("avg_quality"),
        )
        .join(models.PracticeReview, models.Card.id == models.PracticeReview.card_id)
        .join(models.Deck, models.Card.deck_id == models.Deck.id)
        .filter(models.Deck.user_id == current_user.id)
        .filter(models.PracticeReview.user_id == current_user.id)
        .group_by(models.Card.id)
        .having(func.count(models.PracticeReview.id) >= 3)
        .having(func.avg(models.PracticeReview.quality) < 3)
        .order_by(func.avg(models.PracticeReview.quality).asc())
        .limit(15)
        .all()
    )

    return {
        "weak_vocabulary": [
            {
                "id": word.id,
                "term": word.term,
                "translation": word.translation,
                "familiarity_score": word.familiarity_score,
                "context": word.context[:100] if word.context else None,
            }
            for word in weak_words
        ],
        "weak_grammar_points": grammar_analysis[:10],
        "struggling_cards": [
            {
                "card_id": card.id,
                "front": card.front,
                "back": card.back,
                "review_count": int(count),
                "avg_quality": round(float(avg_qual), 2),
            }
            for card, count, avg_qual in struggling_cards
        ],
    }


@router.get("/heatmap")
def get_activity_heatmap(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(90, description="Number of days to analyze"),
):
    """
    Generate activity heatmap data showing daily learning activity.
    Returns daily counts for different activity types.
    """
    from_dt = datetime.utcnow() - timedelta(days=days)
    to_dt = datetime.utcnow()

    # Daily vocabulary reviews
    vocab_activity = (
        db.query(
            func.date(models.PracticeReview.timestamp).label("date"),
            func.count(models.PracticeReview.id).label("count"),
        )
        .filter(models.PracticeReview.user_id == current_user.id)
        .filter(models.PracticeReview.timestamp >= from_dt)
        .filter(models.PracticeReview.timestamp <= to_dt)
        .group_by(func.date(models.PracticeReview.timestamp))
        .all()
    )

    # Daily grammar attempts
    grammar_activity = (
        db.query(
            func.date(models.GrammarExerciseAttempt.created_at).label("date"),
            func.count(models.GrammarExerciseAttempt.id).label("count"),
        )
        .filter(models.GrammarExerciseAttempt.user_id == current_user.id)
        .filter(models.GrammarExerciseAttempt.created_at >= from_dt)
        .filter(models.GrammarExerciseAttempt.created_at <= to_dt)
        .group_by(func.date(models.GrammarExerciseAttempt.created_at))
        .all()
    )

    # Daily writing submissions
    writing_activity = (
        db.query(
            func.date(models.WritingSubmission.created_at).label("date"),
            func.count(models.WritingSubmission.id).label("count"),
        )
        .filter(models.WritingSubmission.user_id == current_user.id)
        .filter(models.WritingSubmission.created_at >= from_dt)
        .filter(models.WritingSubmission.created_at <= to_dt)
        .group_by(func.date(models.WritingSubmission.created_at))
        .all()
    )

    # Combine into a single structure
    activity_map = {}

    for date, count in vocab_activity:
        date_str = str(date)
        if date_str not in activity_map:
            activity_map[date_str] = {"date": date_str, "vocabulary": 0, "grammar": 0, "writing": 0}
        activity_map[date_str]["vocabulary"] = int(count)

    for date, count in grammar_activity:
        date_str = str(date)
        if date_str not in activity_map:
            activity_map[date_str] = {"date": date_str, "vocabulary": 0, "grammar": 0, "writing": 0}
        activity_map[date_str]["grammar"] = int(count)

    for date, count in writing_activity:
        date_str = str(date)
        if date_str not in activity_map:
            activity_map[date_str] = {"date": date_str, "vocabulary": 0, "grammar": 0, "writing": 0}
        activity_map[date_str]["writing"] = int(count)

    # Sort by date
    heatmap_data = sorted(activity_map.values(), key=lambda x: x["date"])

    return {
        "date_range": {
            "from": from_dt.isoformat(),
            "to": to_dt.isoformat(),
            "days": days,
        },
        "heatmap": heatmap_data,
    }
