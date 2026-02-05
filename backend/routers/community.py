"""
Community Router

Enables deck sharing and collaborative challenges:
- Browse and import community decks
- Publish decks for others to use
- Join and track challenges
- Rate and review decks
"""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

import models
from services.auth import get_current_user
from services.database import get_db


def to_uuid(value) -> UUID:
    """Convert string or UUID to UUID object."""
    if isinstance(value, UUID):
        return value
    return UUID(str(value))

logger = logging.getLogger("app.community")

router = APIRouter(prefix="/community", tags=["community"])


# --- Schemas ---
class PublicDeckSummary(BaseModel):
    id: str
    name: str
    description: Optional[str]
    language: str
    level: Optional[str]
    card_count: int
    word_count: int
    downloads: int
    average_rating: Optional[float]
    rating_count: int
    creator_username: Optional[str]
    created_at: str

    class Config:
        orm_mode = True


class PublicDeckDetail(PublicDeckSummary):
    preview_cards: Optional[List[dict]]
    status: str


class PublishDeckRequest(BaseModel):
    deck_id: str
    name: str
    description: Optional[str] = None
    level: Optional[str] = None


class RateDeckRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: Optional[str] = None


class ChallengeSummary(BaseModel):
    id: str
    title: str
    description: Optional[str]
    challenge_type: str
    target_value: int
    target_metric: str
    start_date: str
    end_date: str
    participant_count: int
    user_joined: bool
    user_progress: int
    user_completed: bool

    class Config:
        orm_mode = True


class CreateChallengeRequest(BaseModel):
    title: str
    description: Optional[str] = None
    challenge_type: str = Field(..., description="vocabulary, streak, grammar, time, mixed")
    target_value: int = Field(..., gt=0)
    target_metric: str = Field(..., description="words_learned, streak_days, exercises_completed, reviews_done")
    start_date: datetime
    end_date: datetime
    is_public: bool = True
    max_participants: Optional[int] = None
    language: Optional[str] = None
    reward_points: int = 0


# --- Public Decks Endpoints ---

@router.get("/decks", response_model=dict)
def browse_public_decks(
    language: Optional[str] = Query(None, description="Filter by language"),
    level: Optional[str] = Query(None, description="Filter by CEFR level"),
    sort: str = Query("popular", description="Sort by: popular, recent, rating"),
    search: Optional[str] = Query(None, description="Search by name"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Browse community-shared decks.

    Filters:
    - language: Filter by target language
    - level: Filter by CEFR level (A1-C2)
    - sort: popular (downloads), recent, or rating
    - search: Search deck names
    """
    query = db.query(models.PublicDeck).filter(
        models.PublicDeck.status == "approved"
    )

    if language:
        query = query.filter(models.PublicDeck.language.ilike(f"%{language}%"))
    if level:
        query = query.filter(models.PublicDeck.level == level)
    if search:
        query = query.filter(models.PublicDeck.name.ilike(f"%{search}%"))

    # Sorting
    if sort == "popular":
        query = query.order_by(desc(models.PublicDeck.downloads))
    elif sort == "recent":
        query = query.order_by(desc(models.PublicDeck.created_at))
    elif sort == "rating":
        # Calculate average rating
        query = query.order_by(
            desc(
                func.nullif(models.PublicDeck.rating_sum, 0) /
                func.nullif(models.PublicDeck.rating_count, 0)
            )
        )

    total = query.count()
    decks = query.offset(offset).limit(limit).all()

    # Format response
    deck_list = []
    for deck in decks:
        creator_username = None
        if deck.creator_id:
            creator = db.query(models.User).filter(models.User.id == deck.creator_id).first()
            creator_username = creator.username if creator else None

        avg_rating = None
        if deck.rating_count > 0:
            avg_rating = round(deck.rating_sum / deck.rating_count, 1)

        deck_list.append({
            "id": str(deck.id),
            "name": deck.name,
            "description": deck.description,
            "language": deck.language,
            "level": deck.level,
            "card_count": deck.card_count,
            "word_count": deck.word_count,
            "downloads": deck.downloads,
            "average_rating": avg_rating,
            "rating_count": deck.rating_count,
            "creator_username": creator_username,
            "created_at": deck.created_at.isoformat(),
        })

    return {
        "decks": deck_list,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/decks/{deck_id}", response_model=dict)
def get_public_deck_detail(
    deck_id: str,
    db: Session = Depends(get_db),
):
    """Get detailed information about a public deck including preview cards."""
    deck_uuid = to_uuid(deck_id)
    deck = db.query(models.PublicDeck).filter(
        models.PublicDeck.id == deck_uuid,
        models.PublicDeck.status == "approved"
    ).first()

    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    creator_username = None
    if deck.creator_id:
        creator = db.query(models.User).filter(models.User.id == deck.creator_id).first()
        creator_username = creator.username if creator else None

    avg_rating = None
    if deck.rating_count > 0:
        avg_rating = round(deck.rating_sum / deck.rating_count, 1)

    # Get recent reviews
    reviews = (
        db.query(models.DeckRating)
        .filter(models.DeckRating.deck_id == deck_uuid)
        .order_by(desc(models.DeckRating.created_at))
        .limit(5)
        .all()
    )

    review_list = []
    for r in reviews:
        reviewer = db.query(models.User).filter(models.User.id == r.user_id).first()
        review_list.append({
            "rating": r.rating,
            "review": r.review,
            "username": reviewer.username if reviewer else "Anonymous",
            "created_at": r.created_at.isoformat(),
        })

    return {
        "id": str(deck.id),
        "name": deck.name,
        "description": deck.description,
        "language": deck.language,
        "level": deck.level,
        "card_count": deck.card_count,
        "word_count": deck.word_count,
        "downloads": deck.downloads,
        "average_rating": avg_rating,
        "rating_count": deck.rating_count,
        "creator_username": creator_username,
        "created_at": deck.created_at.isoformat(),
        "preview_cards": deck.preview_cards or [],
        "recent_reviews": review_list,
    }


@router.post("/decks/publish")
def publish_deck(
    request: PublishDeckRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Publish a deck to the community.

    The deck will be submitted for moderation before becoming public.
    """
    # Verify deck ownership
    deck_uuid = to_uuid(request.deck_id)
    deck = db.query(models.Deck).filter(
        models.Deck.id == deck_uuid,
        models.Deck.user_id == current_user.id
    ).first()

    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found or not owned by you")

    # Check if already published
    existing = db.query(models.PublicDeck).filter(
        models.PublicDeck.original_deck_id == deck_uuid
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="This deck is already published")

    # Count cards and words
    card_count = db.query(models.Card).filter(models.Card.deck_id == deck.id).count()
    word_count = db.query(models.Word).filter(models.Word.deck_id == deck.id).count()

    if card_count == 0 and word_count == 0:
        raise HTTPException(status_code=400, detail="Cannot publish an empty deck")

    # Get preview cards (first 5)
    preview_cards = (
        db.query(models.Card)
        .filter(models.Card.deck_id == deck.id)
        .limit(5)
        .all()
    )

    preview_list = [
        {"front": c.front, "back": c.back}
        for c in preview_cards
    ]

    # Create public deck entry
    public_deck = models.PublicDeck(
        original_deck_id=deck.id,
        creator_id=current_user.id,
        name=request.name,
        description=request.description,
        language=deck.language,
        level=request.level,
        card_count=card_count,
        word_count=word_count,
        preview_cards=preview_list,
        status="pending",
    )

    db.add(public_deck)
    db.commit()
    db.refresh(public_deck)

    logger.info(f"User {current_user.id} published deck {deck.id} as public deck {public_deck.id}")

    return {
        "ok": True,
        "public_deck_id": str(public_deck.id),
        "status": "pending",
        "message": "Deck submitted for review. It will be visible once approved.",
    }


@router.post("/decks/{deck_id}/import")
def import_public_deck(
    deck_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Import a public deck to your personal collection.

    Creates a copy of the deck and all its cards.
    """
    deck_uuid = to_uuid(deck_id)
    public_deck = db.query(models.PublicDeck).filter(
        models.PublicDeck.id == deck_uuid,
        models.PublicDeck.status == "approved"
    ).first()

    if not public_deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    # Create new deck for user
    new_deck = models.Deck(
        user_id=current_user.id,
        name=f"{public_deck.name}",
        language=public_deck.language,
    )
    db.add(new_deck)
    db.flush()

    cards_copied = 0
    words_copied = 0

    # Copy cards from original deck if it still exists
    if public_deck.original_deck_id:
        original_cards = db.query(models.Card).filter(
            models.Card.deck_id == public_deck.original_deck_id
        ).all()

        for card in original_cards:
            new_card = models.Card(
                deck_id=new_deck.id,
                front=card.front,
                back=card.back,
            )
            db.add(new_card)
            cards_copied += 1

        # Copy words too
        original_words = db.query(models.Word).filter(
            models.Word.deck_id == public_deck.original_deck_id
        ).all()

        for word in original_words:
            new_word = models.Word(
                deck_id=new_deck.id,
                term=word.term,
                translation=word.translation,
                context=word.context,
                part_of_speech=word.part_of_speech,
            )
            db.add(new_word)
            words_copied += 1

    # Increment download count
    public_deck.downloads = (public_deck.downloads or 0) + 1

    db.commit()

    logger.info(f"User {current_user.id} imported public deck {deck_id}, created deck {new_deck.id}")

    return {
        "ok": True,
        "new_deck_id": str(new_deck.id),
        "cards_copied": cards_copied,
        "words_copied": words_copied,
    }


@router.post("/decks/{deck_id}/rate")
def rate_deck(
    deck_id: str,
    request: RateDeckRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rate and optionally review a public deck."""
    deck_uuid = to_uuid(deck_id)
    public_deck = db.query(models.PublicDeck).filter(
        models.PublicDeck.id == deck_uuid,
        models.PublicDeck.status == "approved"
    ).first()

    if not public_deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    # Check for existing rating
    existing_rating = db.query(models.DeckRating).filter(
        models.DeckRating.deck_id == deck_uuid,
        models.DeckRating.user_id == current_user.id
    ).first()

    if existing_rating:
        # Update existing rating
        old_rating = existing_rating.rating
        existing_rating.rating = request.rating
        existing_rating.review = request.review
        public_deck.rating_sum = (public_deck.rating_sum or 0) - old_rating + request.rating
    else:
        # Create new rating
        new_rating = models.DeckRating(
            deck_id=deck_uuid,
            user_id=current_user.id,
            rating=request.rating,
            review=request.review,
        )
        db.add(new_rating)
        public_deck.rating_sum = (public_deck.rating_sum or 0) + request.rating
        public_deck.rating_count = (public_deck.rating_count or 0) + 1

    db.commit()

    avg_rating = public_deck.rating_sum / public_deck.rating_count if public_deck.rating_count else 0

    return {
        "ok": True,
        "new_average": round(avg_rating, 1),
        "total_ratings": public_deck.rating_count,
    }


# --- Challenges Endpoints ---

@router.get("/challenges", response_model=dict)
def list_challenges(
    active_only: bool = Query(True, description="Only show active challenges"),
    language: Optional[str] = Query(None, description="Filter by language"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List available challenges.

    Returns challenges with user's participation status.
    """
    now = datetime.utcnow()

    query = db.query(models.Challenge).filter(models.Challenge.is_public == True)

    if active_only:
        query = query.filter(
            models.Challenge.start_date <= now,
            models.Challenge.end_date >= now
        )

    if language:
        query = query.filter(
            (models.Challenge.language == None) | (models.Challenge.language.ilike(f"%{language}%"))
        )

    challenges = query.order_by(models.Challenge.end_date.asc()).all()

    result = []
    for challenge in challenges:
        # Get participation info
        participation = db.query(models.ChallengeParticipant).filter(
            models.ChallengeParticipant.challenge_id == challenge.id,
            models.ChallengeParticipant.user_id == current_user.id
        ).first()

        participant_count = db.query(models.ChallengeParticipant).filter(
            models.ChallengeParticipant.challenge_id == challenge.id
        ).count()

        # Calculate time remaining
        if challenge.end_date > now:
            time_remaining = challenge.end_date - now
            days_remaining = time_remaining.days
        else:
            days_remaining = 0

        result.append({
            "id": str(challenge.id),
            "title": challenge.title,
            "description": challenge.description,
            "challenge_type": challenge.challenge_type,
            "target_value": challenge.target_value,
            "target_metric": challenge.target_metric,
            "start_date": challenge.start_date.isoformat(),
            "end_date": challenge.end_date.isoformat(),
            "days_remaining": days_remaining,
            "participant_count": participant_count,
            "user_joined": participation is not None,
            "user_progress": participation.current_progress if participation else 0,
            "user_completed": participation.completed if participation else False,
            "reward_points": challenge.reward_points,
            "badge_name": challenge.badge_name,
        })

    return {"challenges": result, "total": len(result)}


@router.post("/challenges/{challenge_id}/join")
def join_challenge(
    challenge_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join a challenge."""
    challenge_uuid = to_uuid(challenge_id)
    challenge = db.query(models.Challenge).filter(
        models.Challenge.id == challenge_uuid
    ).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Check if challenge is active
    now = datetime.utcnow()
    if challenge.start_date > now:
        raise HTTPException(status_code=400, detail="Challenge hasn't started yet")
    if challenge.end_date < now:
        raise HTTPException(status_code=400, detail="Challenge has ended")

    # Check if already joined
    existing = db.query(models.ChallengeParticipant).filter(
        models.ChallengeParticipant.challenge_id == challenge_uuid,
        models.ChallengeParticipant.user_id == current_user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already joined this challenge")

    # Check max participants
    if challenge.max_participants:
        current_count = db.query(models.ChallengeParticipant).filter(
            models.ChallengeParticipant.challenge_id == challenge_uuid
        ).count()
        if current_count >= challenge.max_participants:
            raise HTTPException(status_code=400, detail="Challenge is full")

    participant = models.ChallengeParticipant(
        challenge_id=challenge_uuid,
        user_id=current_user.id,
    )
    db.add(participant)
    db.commit()

    logger.info(f"User {current_user.id} joined challenge {challenge_id}")

    return {"ok": True, "message": f"Joined challenge: {challenge.title}"}


@router.post("/challenges/{challenge_id}/update-progress")
def update_challenge_progress(
    challenge_id: str,
    progress: int = Body(..., embed=True),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update progress for a challenge."""
    challenge_uuid = to_uuid(challenge_id)
    participation = db.query(models.ChallengeParticipant).filter(
        models.ChallengeParticipant.challenge_id == challenge_uuid,
        models.ChallengeParticipant.user_id == current_user.id
    ).first()

    if not participation:
        raise HTTPException(status_code=404, detail="Not participating in this challenge")

    challenge = db.query(models.Challenge).filter(
        models.Challenge.id == challenge_uuid
    ).first()

    # Update progress
    participation.current_progress = max(participation.current_progress or 0, progress)
    participation.last_updated = datetime.utcnow()

    # Check for completion
    if participation.current_progress >= challenge.target_value and not participation.completed:
        participation.completed = True
        participation.completed_at = datetime.utcnow()

        # Award points if applicable
        if challenge.reward_points > 0:
            user = db.query(models.User).filter(models.User.id == current_user.id).first()
            user.points = (user.points or 0) + challenge.reward_points
            logger.info(f"User {current_user.id} completed challenge {challenge_id}, awarded {challenge.reward_points} points")

    db.commit()

    return {
        "ok": True,
        "current_progress": participation.current_progress,
        "target": challenge.target_value,
        "completed": participation.completed,
        "percentage": min(100, int(participation.current_progress / challenge.target_value * 100)),
    }


@router.get("/challenges/{challenge_id}/leaderboard")
def get_challenge_leaderboard(
    challenge_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get leaderboard for a challenge."""
    challenge_uuid = to_uuid(challenge_id)
    challenge = db.query(models.Challenge).filter(
        models.Challenge.id == challenge_uuid
    ).first()

    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    participants = (
        db.query(models.ChallengeParticipant)
        .filter(models.ChallengeParticipant.challenge_id == challenge_uuid)
        .order_by(
            desc(models.ChallengeParticipant.current_progress),
            models.ChallengeParticipant.last_updated.asc()  # Earlier completion wins ties
        )
        .limit(limit)
        .all()
    )

    leaderboard = []
    for rank, p in enumerate(participants, 1):
        user = db.query(models.User).filter(models.User.id == p.user_id).first()
        leaderboard.append({
            "rank": rank,
            "username": user.username if user else "Unknown",
            "progress": p.current_progress,
            "completed": p.completed,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
            "is_current_user": str(p.user_id) == str(current_user.id),
        })

    # Find current user's rank if not in top
    user_in_list = any(l["is_current_user"] for l in leaderboard)
    user_rank = None
    user_progress = 0

    if not user_in_list:
        participation = db.query(models.ChallengeParticipant).filter(
            models.ChallengeParticipant.challenge_id == challenge_uuid,
            models.ChallengeParticipant.user_id == current_user.id
        ).first()

        if participation:
            # Count how many have more progress
            higher_count = db.query(models.ChallengeParticipant).filter(
                models.ChallengeParticipant.challenge_id == challenge_uuid,
                models.ChallengeParticipant.current_progress > participation.current_progress
            ).count()
            user_rank = higher_count + 1
            user_progress = participation.current_progress

    return {
        "challenge": {
            "id": str(challenge.id),
            "title": challenge.title,
            "target_value": challenge.target_value,
        },
        "leaderboard": leaderboard,
        "current_user": {
            "rank": user_rank,
            "progress": user_progress,
            "in_leaderboard": user_in_list,
        } if not user_in_list else None,
    }


@router.post("/challenges/create")
def create_challenge(
    request: CreateChallengeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new challenge (for power users or admins).

    Note: In production, this might be limited to certain user roles.
    """
    if request.end_date <= request.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    challenge = models.Challenge(
        creator_id=current_user.id,
        title=request.title,
        description=request.description,
        challenge_type=request.challenge_type,
        target_value=request.target_value,
        target_metric=request.target_metric,
        start_date=request.start_date,
        end_date=request.end_date,
        is_public=request.is_public,
        max_participants=request.max_participants,
        language=request.language,
        reward_points=request.reward_points,
    )

    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    logger.info(f"User {current_user.id} created challenge {challenge.id}")

    return {
        "ok": True,
        "challenge_id": str(challenge.id),
        "message": f"Challenge '{challenge.title}' created successfully",
    }
