from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..services.database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=schemas.UserRead)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = (
        db.query(models.User).filter(models.User.username == user.username).first()
    )
    if db_user:
        return db_user

    # Create new user
    new_user = models.User(
        username=user.username, last_active_date=date.today(), streak=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/{user_id}", response_model=schemas.UserRead)
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Ensure numeric fields are not None to satisfy response schema
    if getattr(user, "new_words_this_week", None) is None:
        user.new_words_this_week = 0
    if getattr(user, "practice_sessions_this_week", None) is None:
        user.practice_sessions_this_week = 0
    if getattr(user, "points", None) is None:
        user.points = 0
    if getattr(user, "streak", None) is None:
        user.streak = 0
    return user


@router.post("/{user_id}/check-in")
def check_in(user_id: int, db: Session = Depends(get_db)):
    # 1. Get the user
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.points is None:
        user.points = 0
    if user.streak is None:
        user.streak = 0
    # ---------------------------------------------

    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)

    # 2. Logic to handle Streak
    # CASE A: First time ever checking in (last_active_date is None)
    if user.last_active_date is None:
        user.streak = 1
        user.points += 10  # Now safe because user.points is guaranteed to be an int
        message = "First check-in! Streak started."

    # CASE B: Already checked in today
    elif user.last_active_date == today:
        return {
            "message": "Already checked in today",
            "streak": user.streak,
            "points": user.points,
        }

    # CASE C: Checked in yesterday (Increment Streak)
    elif user.last_active_date == yesterday:
        user.streak += 1
        user.points += 10
        message = "Streak continued!"

    # CASE D: Missed a day or more (Reset Streak)
    else:
        user.streak = 1
        user.points += 10
        message = "Streak reset, but welcome back!"

    # 3. Update the date and save
    user.last_active_date = today
    db.commit()

    return {"message": message, "streak": user.streak, "points": user.points}


@router.get("/{user_id}/progress")
def get_detailed_progress(user_id: int, db: Session = Depends(get_db)):
    """
    Calculates progress against goals for the Dashboard view.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    # In a real app, you'd query the PracticeSession table here to get
    # actual counts for the current week.

    return {
        "points": user.points,
        "streak": user.streak,
        "weekly_words": user.new_words_this_week,
        "weekly_sessions": user.practice_sessions_this_week,
        "total_decks": db.query(models.Deck)
        .filter(models.Deck.user_id == user_id)
        .count(),
    }


@router.get("/{user_id}/dashboard", response_model=dict)
async def get_dashboard_data(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch due words count for the study plan
    due_words_count = (
        db.query(models.Word)
        .filter(models.Word.next_review_date <= datetime.utcnow())
        .count()
    )

    # Ask Gemini for a personalized summary/motivation
    # (Optional: can be moved to a background task)
    motivation = f"You're doing great! You've learned {user.new_words_this_week} words this week."

    return {
        "user": {
            "username": user.username,
            "points": user.points,
            "streak": user.streak,
        },
        "progress": {
            "newWordsThisWeek": user.new_words_this_week,
            "practiceSessionsThisWeek": user.practice_sessions_this_week,
            "wordsGoal": 20,  # Pull from Goal model if you implemented it
            "sessionsGoal": 3,
        },
        "studyPlan": {
            "summary": motivation,
            "tasks": [
                {
                    "id": "1",
                    "type": "flashcards",
                    "title": "Daily Review",
                    "description": f"{due_words_count} words waiting",
                    "targetView": "flashcards",
                },
                {
                    "id": "2",
                    "type": "read",
                    "title": "Read an Article",
                    "description": "Boost your comprehension",
                    "targetView": "reader",
                },
            ],
        },
    }
