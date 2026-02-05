from datetime import datetime, timedelta
from typing import Optional

# Leech detection threshold
LEECH_THRESHOLD = 8  # Number of lapses before flagging as leech


def update_card_after_review(
    card,
    quality: int,
    response_time_ms: Optional[int] = None
):
    """Apply enhanced SM-2 algorithm to a card-like object with leech detection.

    card must have attributes: repetition (int), interval (int), easiness_factor (float),
    last_reviewed_date, next_review_date, lapses (int), is_leech (bool), total_reviews (int).
    The function mutates the card and returns it.

    Args:
        card: Card object with SRS fields
        quality: 0-5 (0 worst, 5 perfect)
        response_time_ms: Optional response time in milliseconds

    Returns:
        The mutated card object
    """
    q = max(0, min(5, int(quality)))

    # Track lapses and handle failures
    if q < 3:
        # Failed review - increment lapses and reset
        card.lapses = (card.lapses or 0) + 1
        card.repetition = 0
        card.interval = 1

        # Leech detection
        if card.lapses >= LEECH_THRESHOLD:
            card.is_leech = True
    else:
        # Successful review
        card.repetition = (card.repetition or 0) + 1
        if card.repetition == 1:
            card.interval = 1
        elif card.repetition == 2:
            card.interval = 6
        else:
            # next interval = previous_interval * EF
            prev_interval = card.interval or 1
            card.interval = int(round(prev_interval * (card.easiness_factor or 2.5)))

    # Response time bonus for fast correct answers
    if response_time_ms and q >= 4 and response_time_ms < 3000:
        # Give a 10% interval bonus for quick correct answers
        card.interval = int(card.interval * 1.1)

    # Update Easiness Factor
    ef = card.easiness_factor or 2.5
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    card.easiness_factor = max(1.3, ef)

    # Update review counts and dates
    card.total_reviews = (card.total_reviews or 0) + 1
    card.last_reviewed_date = datetime.utcnow()
    card.next_review_date = datetime.utcnow() + timedelta(days=card.interval)

    return card


def update_word_after_review(
    word,
    quality: int,
    response_time_ms: Optional[int] = None
):
    """Apply enhanced SM-2 algorithm to a word object with leech detection.

    Similar to update_card_after_review but for Word objects.
    Updates familiarity_score based on quality.

    Args:
        word: Word object with SRS fields
        quality: 0-5 (0 worst, 5 perfect)
        response_time_ms: Optional response time in milliseconds

    Returns:
        The mutated word object
    """
    q = max(0, min(5, int(quality)))

    # Track lapses and handle failures
    if q < 3:
        # Failed review - increment lapses
        word.lapses = (word.lapses or 0) + 1
        word.interval = 1

        # Leech detection
        if word.lapses >= LEECH_THRESHOLD:
            word.is_leech = True

        # Decrease familiarity on failure
        word.familiarity_score = max(0, (word.familiarity_score or 0) - 1)
    else:
        # Successful review
        if word.interval == 0:
            word.interval = 1
        elif word.interval == 1:
            word.interval = 6
        else:
            prev_interval = word.interval or 1
            word.interval = int(round(prev_interval * (word.easiness_factor or 2.5)))

        # Increase familiarity on success
        word.familiarity_score = min(5, (word.familiarity_score or 0) + 1)

    # Response time bonus for fast correct answers
    if response_time_ms and q >= 4 and response_time_ms < 3000:
        word.interval = int(word.interval * 1.1)

    # Update Easiness Factor
    ef = word.easiness_factor or 2.5
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    word.easiness_factor = max(1.3, ef)

    # Update review dates
    word.last_reviewed_date = datetime.utcnow()
    word.next_review_date = datetime.utcnow() + timedelta(days=word.interval)

    return word


def reset_leech_status(card_or_word):
    """Reset leech status after user has addressed the problem.

    Args:
        card_or_word: Card or Word object

    Returns:
        The mutated object
    """
    card_or_word.is_leech = False
    card_or_word.lapses = 0
    return card_or_word
