"""
Recommendations Router

Generates personalized learning recommendations based on:
- User's estimated level from diagnostic
- Weak areas from analytics
- Leech cards that need attention
- Recent activity patterns
- Incomplete exercises
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from services.auth import get_current_user
from services.database import get_db

logger = logging.getLogger("app.recommendations")

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


# --- Schemas ---
class RecommendationAction(BaseModel):
    type: str
    target: Optional[str] = None
    params: Optional[dict] = None


class Recommendation(BaseModel):
    type: str  # warning, practice, suggestion, tip
    priority: str  # high, medium, low
    title: str
    description: str
    action: RecommendationAction


class RecommendationsResponse(BaseModel):
    user_level: Optional[str]
    total_recommendations: int
    recommendations: List[Recommendation]


@router.get("/", response_model=RecommendationsResponse)
def get_recommendations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate personalized learning recommendations.

    Analyzes:
    - Leech cards (cards with 8+ failures)
    - Weak grammar areas (accuracy < 60%)
    - Incomplete video exercises
    - Recent vocabulary for writing practice
    - User's estimated level for level-appropriate tips
    """
    recommendations: List[Recommendation] = []

    # Get user profile for level
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()

    user_level = profile.estimated_level if profile else None

    # 1. Check for leech cards (HIGH PRIORITY)
    leech_count = (
        db.query(func.count(models.Card.id))
        .join(models.Deck)
        .filter(
            models.Deck.user_id == current_user.id,
            models.Card.is_leech == True
        )
        .scalar() or 0
    )

    if leech_count > 0:
        recommendations.append(Recommendation(
            type="warning",
            priority="high",
            title=f"You have {leech_count} difficult card{'s' if leech_count > 1 else ''}",
            description="These cards have been failed 8+ times. Consider adding mnemonics, breaking them down, or studying them differently.",
            action=RecommendationAction(type="view_leeches")
        ))

    # 2. Check weak grammar areas (MEDIUM PRIORITY)
    weak_grammar = (
        db.query(
            models.GrammarExercise.grammar_point,
            func.count(models.GrammarExercise.id).label("total"),
            func.sum(models.GrammarExercise.correct_attempts).label("correct"),
            func.sum(models.GrammarExercise.attempts).label("attempts")
        )
        .join(models.GrammarExerciseSet)
        .filter(
            models.GrammarExerciseSet.user_id == current_user.id,
            models.GrammarExercise.attempts > 2
        )
        .group_by(models.GrammarExercise.grammar_point)
        .all()
    )

    for grammar_point, total, correct, attempts in weak_grammar:
        if attempts and attempts > 0:
            accuracy = (correct or 0) / attempts * 100
            if accuracy < 60:
                recommendations.append(Recommendation(
                    type="practice",
                    priority="medium",
                    title=f"Practice: {grammar_point}",
                    description=f"Your accuracy is {accuracy:.0f}%. More practice recommended.",
                    action=RecommendationAction(
                        type="grammar_practice",
                        target=grammar_point
                    )
                ))

    # Limit grammar recommendations
    grammar_recs = [r for r in recommendations if r.action.type == "grammar_practice"]
    if len(grammar_recs) > 3:
        # Keep only top 3 grammar recommendations
        for rec in grammar_recs[3:]:
            recommendations.remove(rec)

    # 3. Check for incomplete video exercises (MEDIUM PRIORITY)
    video_count = (
        db.query(func.count(models.VideoContent.id))
        .filter(models.VideoContent.user_id == current_user.id)
        .scalar() or 0
    )

    if video_count > 0:
        video_exercises_done = (
            db.query(func.count(models.VideoExerciseAttempt.id))
            .filter(
                models.VideoExerciseAttempt.user_id == current_user.id,
                models.VideoExerciseAttempt.is_correct == True
            )
            .scalar() or 0
        )

        # Estimate expected exercises (5 per video on average)
        expected = video_count * 5
        if video_exercises_done < expected * 0.5:
            recommendations.append(Recommendation(
                type="suggestion",
                priority="medium",
                title="Complete video exercises",
                description=f"You have {video_count} video{'s' if video_count > 1 else ''} with exercises to complete.",
                action=RecommendationAction(type="video_practice")
            ))

    # 4. Check due cards (MEDIUM PRIORITY)
    now = datetime.utcnow()
    due_cards = (
        db.query(func.count(models.Card.id))
        .join(models.Deck)
        .filter(
            models.Deck.user_id == current_user.id,
            models.Card.next_review_date <= now
        )
        .scalar() or 0
    )

    if due_cards > 20:
        recommendations.append(Recommendation(
            type="warning",
            priority="high",
            title=f"{due_cards} cards are due for review",
            description="Don't let your review pile grow too large. Try to review daily.",
            action=RecommendationAction(type="flashcard_practice")
        ))
    elif due_cards > 0:
        recommendations.append(Recommendation(
            type="suggestion",
            priority="low",
            title=f"{due_cards} card{'s' if due_cards > 1 else ''} ready for review",
            description="Keep up your streak by reviewing your due cards.",
            action=RecommendationAction(type="flashcard_practice")
        ))

    # 5. Level-based tips (LOW PRIORITY)
    if user_level:
        level_tips = get_level_tips(user_level)
        for tip in level_tips[:2]:  # Limit to 2 tips
            recommendations.append(Recommendation(
                type="tip",
                priority="low",
                title=tip["title"],
                description=tip["description"],
                action=RecommendationAction(type=tip["action"])
            ))

    # 6. Check for no diagnostic (MEDIUM PRIORITY if missing)
    if not user_level:
        recommendations.append(Recommendation(
            type="suggestion",
            priority="medium",
            title="Take the placement test",
            description="Complete a diagnostic test to get personalized recommendations for your level.",
            action=RecommendationAction(type="diagnostic")
        ))

    # 7. Check streak status
    goal = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id
    ).first()

    if goal and goal.last_activity_date:
        days_since_activity = (datetime.utcnow().date() - goal.last_activity_date).days
        if days_since_activity >= 1:
            if goal.current_streak > 0:
                recommendations.append(Recommendation(
                    type="warning",
                    priority="high",
                    title="Don't lose your streak!",
                    description=f"You have a {goal.current_streak}-day streak. Practice today to keep it going!",
                    action=RecommendationAction(type="flashcard_practice")
                ))

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda x: priority_order.get(x.priority, 2))

    return RecommendationsResponse(
        user_level=user_level,
        total_recommendations=len(recommendations),
        recommendations=recommendations[:10]  # Limit to 10 recommendations
    )


def get_level_tips(level: str) -> List[dict]:
    """Get level-appropriate learning tips."""
    tips = {
        "A1": [
            {
                "title": "Focus on vocabulary",
                "description": "At your level, building vocabulary is key. Aim for 10 new words daily.",
                "action": "add_vocabulary"
            },
            {
                "title": "Learn common phrases",
                "description": "Memorize useful phrases for greetings, introductions, and basic questions.",
                "action": "flashcard_practice"
            }
        ],
        "A2": [
            {
                "title": "Start simple conversations",
                "description": "Practice with conversation scenarios about daily activities.",
                "action": "conversation_practice"
            },
            {
                "title": "Read graded content",
                "description": "Try reading simple texts to see vocabulary in context.",
                "action": "reading_practice"
            }
        ],
        "B1": [
            {
                "title": "Practice writing",
                "description": "Writing helps solidify grammar. Try the writing practice mode.",
                "action": "writing_practice"
            },
            {
                "title": "Focus on grammar patterns",
                "description": "Work on past tenses, conditionals, and expressing opinions.",
                "action": "grammar_practice"
            }
        ],
        "B2": [
            {
                "title": "Watch authentic content",
                "description": "Use video learning to practice with real media content.",
                "action": "video_practice"
            },
            {
                "title": "Express complex ideas",
                "description": "Practice explaining abstract concepts and hypothetical situations.",
                "action": "writing_practice"
            }
        ],
        "C1": [
            {
                "title": "Master idioms and nuance",
                "description": "Focus on idiomatic expressions and cultural context.",
                "action": "reading_practice"
            },
            {
                "title": "Practice formal register",
                "description": "Work on academic and professional language styles.",
                "action": "writing_practice"
            }
        ],
        "C2": [
            {
                "title": "Maintain through immersion",
                "description": "Keep your skills sharp with daily authentic content.",
                "action": "video_practice"
            },
            {
                "title": "Help others learn",
                "description": "Teaching reinforces mastery. Consider creating content.",
                "action": "community"
            }
        ]
    }

    return tips.get(level, tips["A2"])  # Default to A2 tips


@router.get("/daily-focus")
def get_daily_focus(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a focused recommendation for today's practice.

    Returns a single, actionable suggestion based on:
    - Most urgent items (leeches, overdue cards)
    - User's progress toward daily goals
    - Variety in practice modes
    """
    now = datetime.utcnow()
    today = now.date()

    # Check what user has done today
    today_reviews = (
        db.query(func.count(models.PracticeReview.id))
        .filter(
            models.PracticeReview.user_id == current_user.id,
            func.date(models.PracticeReview.timestamp) == today
        )
        .scalar() or 0
    )

    today_grammar = (
        db.query(func.count(models.GrammarExerciseAttempt.id))
        .filter(
            models.GrammarExerciseAttempt.user_id == current_user.id,
            func.date(models.GrammarExerciseAttempt.created_at) == today
        )
        .scalar() or 0
    )

    # Get goals
    goal = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id
    ).first()

    cards_goal = goal.cards_per_day if goal else 20
    grammar_goal = goal.grammar_exercises_per_day if goal else 5

    # Determine focus based on progress
    if today_reviews < cards_goal * 0.5:
        # Less than 50% of card goal
        due_count = (
            db.query(func.count(models.Card.id))
            .join(models.Deck)
            .filter(
                models.Deck.user_id == current_user.id,
                models.Card.next_review_date <= now
            )
            .scalar() or 0
        )

        return {
            "focus": "flashcards",
            "title": "Review your flashcards",
            "description": f"You've reviewed {today_reviews} cards today. Goal: {cards_goal}. {due_count} cards are due.",
            "progress": round(today_reviews / cards_goal * 100) if cards_goal > 0 else 100,
            "action": {"type": "flashcard_practice"}
        }

    elif today_grammar < grammar_goal * 0.5:
        # Less than 50% of grammar goal
        return {
            "focus": "grammar",
            "title": "Practice grammar",
            "description": f"You've done {today_grammar} grammar exercises today. Goal: {grammar_goal}.",
            "progress": round(today_grammar / grammar_goal * 100) if grammar_goal > 0 else 100,
            "action": {"type": "grammar_practice"}
        }

    else:
        # Goals met - suggest variety
        return {
            "focus": "mixed",
            "title": "Great progress today!",
            "description": "You've met your daily goals. Try mixed practice for variety.",
            "progress": 100,
            "action": {"type": "mixed_practice"}
        }
