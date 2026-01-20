from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import models
from ..services.database import get_db

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/top")
def get_top_users(limit: int = 10, db: Session = Depends(get_db)):
    """Return the top users by points."""
    users = db.query(models.User).order_by(models.User.points.desc()).limit(limit).all()
    # Return lightweight dicts
    return [
        {"id": u.id, "username": u.username, "points": u.points, "streak": u.streak}
        for u in users
    ]
