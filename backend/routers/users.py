import logging
from datetime import date, datetime, timedelta
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import func

import models
import schemas
from services.auth import get_current_user
from services.database import get_db

# Setup logger
logger = logging.getLogger("app.users")

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=schemas.UserMe)
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return current_user

@router.post("/", response_model=schemas.UserRead)
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user. 
    Note: In production, password hashing should happen here or in a service.
    """
    # Check if user exists
    db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user:
        logger.info(f"Login attempt for existing user: {user_in.username}")
        return db_user

    try:
        # Create new user - UUID is typically handled by the DB or model default
        new_user = models.User(
            username=user_in.username,
            last_active_date=date.today(),
            streak=1,
            points=0,
            new_words_this_week=0,
            practice_sessions_this_week=0
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"Created new user: {new_user.username} with ID {new_user.id}")
        return new_user
    except IntegrityError:
        db.rollback()
        logger.warning(f"Integrity error during user creation for: {user_in.username}")
        raise HTTPException(status_code=400, detail="Username already taken")
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error during user creation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/stats", response_model=schemas.UserRead)
def get_user_stats(current_user: models.User = Depends(get_current_user)):
    """Return user stats with default value handling."""
    # Ensure numeric fields are not None for the response schema
    # (Alternatively, set these defaults in your SQLAlchemy model definition)
    stats_fields = ["new_words_this_week", "practice_sessions_this_week", "points", "streak"]
    for field in stats_fields:
        if getattr(current_user, field) is None:
            setattr(current_user, field, 0)
    
    return current_user

@router.post("/check-in")
def check_in(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user streak and award daily points."""
    user = current_user
    
    # Initialize values if they are None
    user.points = user.points or 0
    user.streak = user.streak or 0

    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    message = ""

    try:
        # CASE A: Already checked in today
        if user.last_active_date == today:
            return {
                "message": "Already checked in today",
                "streak": user.streak,
                "points": user.points,
            }

        # CASE B: First time or Streak continued (checked in yesterday)
        if user.last_active_date is None or user.last_active_date == yesterday:
            user.streak += 1
            user.points += 10
            message = "Streak continued!" if user.last_active_date else "First check-in! Streak started."
        
        # CASE C: Missed a day or more
        else:
            logger.info(f"User {user.id} streak reset. Last active was {user.last_active_date}")
            user.streak = 1
            user.points += 10
            message = "Streak reset, but welcome back!"

        user.last_active_date = today
        db.commit()
        
        logger.info(f"User {user.id} checked in. New streak: {user.streak}")
        return {"message": message, "streak": user.streak, "points": user.points}

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Check-in failed for user {user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update check-in status")

@router.get("/progress")
def get_detailed_progress(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculates progress against goals for the Dashboard view."""
    try:
        # Count only decks belonging to this user (UUID string)
        total_decks = db.query(models.Deck).filter(models.Deck.user_id == str(current_user.id)).count()

        return {
            "points": current_user.points or 0,
            "streak": current_user.streak or 0,
            "weekly_words": current_user.new_words_this_week or 0,
            "weekly_sessions": current_user.practice_sessions_this_week or 0,
            "total_decks": total_decks,
        }
    except SQLAlchemyError as e:
        logger.error(f"Error fetching progress for {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching progress data")

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_data(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch a combined view of user stats, progress, and pending tasks."""
    try:
        # IMPORTANT: Filter words by user's decks only!
        # Assuming Word -> Deck -> User relationship
        due_words_count = (
            db.query(models.Word)
            .join(models.Deck)
            .filter(
                models.Deck.user_id == str(current_user.id),
                models.Word.next_review_date <= datetime.utcnow()
            )
            .count()
        )

        motivation = f"You're doing great! You've learned {current_user.new_words_this_week or 0} words this week."

        return {
            "user": {
                "username": current_user.username,
                "points": current_user.points or 0,
                "streak": current_user.streak or 0,
            },
            "progress": {
                "newWordsThisWeek": current_user.new_words_this_week or 0,
                "practiceSessionsThisWeek": current_user.practice_sessions_this_week or 0,
                "wordsGoal": 20, 
                "sessionsGoal": 3,
            },
            "studyPlan": {
                "summary": motivation,
                "tasks": [
                    {
                        "id": "task_1",
                        "type": "flashcards",
                        "title": "Daily Review",
                        "description": f"{due_words_count} words waiting",
                        "targetView": "flashcards",
                    },
                    {
                        "id": "task_2",
                        "type": "read",
                        "title": "Read an Article",
                        "description": "Boost your comprehension",
                        "targetView": "reader",
                    },
                ],
            },
        }
    except SQLAlchemyError as e:
        logger.error(f"Dashboard data fetch failed for {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error fetching dashboard")


@router.get("/daily-progress")
def get_daily_progress(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get today's progress against daily goals.

    Returns:
    - Current progress (cards reviewed, grammar exercises)
    - Daily goals
    - Completion percentages
    - Streak information
    """
    today = date.today()

    # Get or create goal
    goal = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id
    ).first()

    if not goal:
        goal = models.Goal(user_id=current_user.id)
        db.add(goal)
        db.commit()
        db.refresh(goal)

    # Count today's card reviews
    today_reviews = (
        db.query(func.count(models.PracticeReview.id))
        .filter(
            models.PracticeReview.user_id == current_user.id,
            func.date(models.PracticeReview.timestamp) == today
        )
        .scalar() or 0
    )

    # Count today's grammar exercises
    today_grammar = (
        db.query(func.count(models.GrammarExerciseAttempt.id))
        .filter(
            models.GrammarExerciseAttempt.user_id == current_user.id,
            func.date(models.GrammarExerciseAttempt.created_at) == today
        )
        .scalar() or 0
    )

    # Count today's writing submissions
    today_writing = (
        db.query(func.count(models.WritingSubmission.id))
        .filter(
            models.WritingSubmission.user_id == current_user.id,
            func.date(models.WritingSubmission.created_at) == today
        )
        .scalar() or 0
    )

    # Calculate completion percentages
    cards_completion = min(100, int(today_reviews / goal.cards_per_day * 100)) if goal.cards_per_day else 100
    grammar_completion = min(100, int(today_grammar / goal.grammar_exercises_per_day * 100)) if goal.grammar_exercises_per_day else 100

    # Update streak if needed
    streak_info = update_streak_if_needed(db, goal, today, today_reviews + today_grammar > 0)

    return {
        "date": str(today),
        "goals": {
            "cards_per_day": goal.cards_per_day,
            "grammar_exercises_per_day": goal.grammar_exercises_per_day,
            "minutes_per_day": goal.minutes_per_day,
        },
        "progress": {
            "cards_reviewed": today_reviews,
            "grammar_completed": today_grammar,
            "writing_submitted": today_writing,
        },
        "completion": {
            "cards": cards_completion,
            "grammar": grammar_completion,
            "overall": min(100, (cards_completion + grammar_completion) // 2),
        },
        "streak": streak_info,
    }


def update_streak_if_needed(db: Session, goal: models.Goal, today: date, has_activity: bool) -> dict:
    """Update streak based on today's activity."""
    yesterday = today - timedelta(days=1)

    # Check if we need to update the streak
    if goal.last_activity_date == today:
        # Already updated today
        pass
    elif has_activity:
        if goal.last_activity_date == yesterday:
            # Continuing streak
            goal.current_streak = (goal.current_streak or 0) + 1
        elif goal.last_activity_date is None or goal.last_activity_date < yesterday:
            # Streak broken, but we can use a freeze
            days_missed = (today - (goal.last_activity_date or today)).days - 1
            if days_missed == 1 and goal.streak_freezes_available > 0:
                # Use a freeze
                goal.streak_freezes_available -= 1
                goal.current_streak = (goal.current_streak or 0) + 1
            else:
                # Streak reset
                goal.current_streak = 1

        goal.last_activity_date = today

        # Update longest streak
        if goal.current_streak > (goal.longest_streak or 0):
            goal.longest_streak = goal.current_streak

        db.commit()

    return {
        "current": goal.current_streak or 0,
        "longest": goal.longest_streak or 0,
        "freezes_available": goal.streak_freezes_available or 0,
        "last_activity": str(goal.last_activity_date) if goal.last_activity_date else None,
    }


@router.put("/goals")
def update_goals(
    cards_per_day: int = None,
    grammar_exercises_per_day: int = None,
    minutes_per_day: int = None,
    words_per_week: int = None,
    practice_sessions_per_week: int = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user's learning goals."""
    goal = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id
    ).first()

    if not goal:
        goal = models.Goal(user_id=current_user.id)
        db.add(goal)

    # Update provided fields
    if cards_per_day is not None:
        goal.cards_per_day = max(1, cards_per_day)
    if grammar_exercises_per_day is not None:
        goal.grammar_exercises_per_day = max(0, grammar_exercises_per_day)
    if minutes_per_day is not None:
        goal.minutes_per_day = max(5, minutes_per_day)
    if words_per_week is not None:
        goal.words_per_week = max(1, words_per_week)
    if practice_sessions_per_week is not None:
        goal.practice_sessions_per_week = max(1, practice_sessions_per_week)

    goal.updated_at = datetime.utcnow()
    db.commit()

    return {
        "ok": True,
        "goals": {
            "cards_per_day": goal.cards_per_day,
            "grammar_exercises_per_day": goal.grammar_exercises_per_day,
            "minutes_per_day": goal.minutes_per_day,
            "words_per_week": goal.words_per_week,
            "practice_sessions_per_week": goal.practice_sessions_per_week,
        }
    }


@router.post("/streak/freeze")
def use_streak_freeze(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Use a streak freeze to protect the current streak."""
    goal = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="No goals found")

    if goal.streak_freezes_available <= 0:
        raise HTTPException(status_code=400, detail="No streak freezes available")

    goal.streak_freezes_available -= 1
    db.commit()

    return {
        "ok": True,
        "freezes_remaining": goal.streak_freezes_available,
        "message": "Streak freeze used successfully"
    }