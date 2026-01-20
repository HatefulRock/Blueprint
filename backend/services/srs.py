from datetime import datetime, timedelta


def update_card_after_review(card, quality: int):
    """Apply SM-2 algorithm to a card-like object.

    card must have attributes: repetition (int), interval (int), easiness_factor (float),
    last_reviewed_date, next_review_date. The function mutates the card and returns it.

    quality expected 0-5 (0 worst, 5 perfect)
    """
    q = max(0, min(5, int(quality)))

    # If quality < 3, reset repetitions
    if q < 3:
        card.repetition = 0
        card.interval = 1
    else:
        card.repetition = (card.repetition or 0) + 1
        if card.repetition == 1:
            card.interval = 1
        elif card.repetition == 2:
            card.interval = 6
        else:
            # next interval = previous_interval * EF
            prev_interval = card.interval or 1
            card.interval = int(round(prev_interval * (card.easiness_factor or 2.5)))

    # Update EF
    ef = card.easiness_factor or 2.5
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    card.easiness_factor = max(1.3, ef)

    card.last_reviewed_date = datetime.utcnow()
    card.next_review_date = datetime.utcnow() + timedelta(days=card.interval)

    return card
