from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional

from ..services.database import get_db
from .. import models

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
