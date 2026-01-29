from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from jinja2 import Template

import models

class CardService:
    """Service for creating flashcards from words with template rendering."""

    @staticmethod
    def get_template(db: Session, template_id: Optional[str] = None) -> Optional[models.CardTemplate]:
        """Get a card template by ID or fall back to default 'Basic' template.

        Args:
            db: Database session
            template_id: Optional template ID to look up

        Returns:
            CardTemplate instance or None
        """
        template = None

        if template_id:
            template = (
                db.query(models.CardTemplate)
                .filter(models.CardTemplate.id == template_id)
                .first()
            )

        # Fallback to default Basic template
        if not template:
            template = (
                db.query(models.CardTemplate)
                .filter(
                    models.CardTemplate.name == "Basic",
                    models.CardTemplate.user_id == None
                )
                .first()
            )

        return template

    @staticmethod
    def build_context_from_word(word: models.Word) -> Dict[str, Any]:
        """Build a Jinja2 context dictionary from a Word model.

        Args:
            word: Word model instance

        Returns:
            Dictionary with word fields for template rendering
        """
        return {
            "term": word.term or "",
            "translation": word.translation or "",
            "context": word.context or "",
            "part_of_speech": word.part_of_speech or "",
            "literal_translation": word.literal_translation or "",
            "grammatical_breakdown": word.grammatical_breakdown or "",
        }

    @staticmethod
    def render_card_content(
        template: Optional[models.CardTemplate],
        context: Dict[str, Any]
    ) -> tuple[str, str]:
        """Render front and back of a card using template and context.

        Args:
            template: CardTemplate to use for rendering
            context: Dictionary with word fields

        Returns:
            Tuple of (front_text, back_text)
        """
        if template:
            front = Template(template.front_template).render(**context)
            back = Template(template.back_template).render(**context)
        else:
            # Fallback if no template exists
            front = context.get("term", "")
            back = context.get("translation", "")

        return front, back

    @staticmethod
    def create_card_from_word(
        db: Session,
        word: models.Word,
        template_id: Optional[str] = None,
        deck_id_override: Optional[str] = None
    ) -> models.Card:
        """Create a single card from a word using the specified template.

        Args:
            db: Database session
            word: Word to create card from
            template_id: Optional template ID (uses default if None)
            deck_id_override: Optional deck ID to override word's deck

        Returns:
            Created Card instance (not yet committed)
        """
        template = CardService.get_template(db, template_id)
        context = CardService.build_context_from_word(word)
        front, back = CardService.render_card_content(template, context)

        # Ensure we have content for the card
        if not front or not front.strip():
            front = word.term or "No content"
        if not back or not back.strip():
            # Build a comprehensive back side
            back_parts = []
            if word.translation:
                back_parts.append(f"Translation: {word.translation}")
            if word.part_of_speech:
                back_parts.append(f"Part of Speech: {word.part_of_speech}")
            if word.context:
                back_parts.append(f"Context: {word.context}")
            back = "\n\n".join(back_parts) if back_parts else "No translation available"

        # New cards should be immediately due for first review
        # Set next_review_date to 1 minute ago so they show up in due cards
        card = models.Card(
            deck_id=deck_id_override or word.deck_id,
            template_id=template.id if template else None,
            front=front,
            back=back,
            word_id=word.id,
            next_review_date=datetime.utcnow() - timedelta(minutes=1),
            repetition=0,
            easiness_factor=2.5,
            interval=0
        )

        return card

    @staticmethod
    def bulk_create_cards_from_words(
        db: Session,
        words: List[models.Word],
        template_id: Optional[str] = None,
        deck_id_override: Optional[str] = None,
        commit: bool = True
    ) -> List[models.Card]:
        """Create multiple cards from a list of words efficiently.

        Args:
            db: Database session
            words: List of Word instances to create cards from
            template_id: Optional template ID (uses default if None)
            deck_id_override: Optional deck ID to override words' decks
            commit: Whether to commit and refresh cards (default True)

        Returns:
            List of created Card instances
        """
        if not words:
            return []

        # Get template once for all cards
        template = CardService.get_template(db, template_id)

        created_cards = []
        for word in words:
            context = CardService.build_context_from_word(word)
            front, back = CardService.render_card_content(template, context)

            card = models.Card(
                deck_id=deck_id_override or word.deck_id,
                template_id=template.id if template else None,
                front=front,
                back=back,
                word_id=word.id,
            )
            db.add(card)
            created_cards.append(card)

        if commit:
            db.commit()
            # Refresh all cards to get generated IDs
            for card in created_cards:
                db.refresh(card)

        return created_cards

    @staticmethod
    def bulk_create_cards_from_word_ids(
        db: Session,
        word_ids: List[str],
        template_id: Optional[str] = None,
        deck_id_override: Optional[str] = None,
        commit: bool = True
    ) -> List[models.Card]:
        """Create multiple cards from a list of word IDs efficiently.

        This method avoids N+1 queries by fetching all words in a single query.

        Args:
            db: Database session
            word_ids: List of word IDs to create cards from
            template_id: Optional template ID (uses default if None)
            deck_id_override: Optional deck ID to override words' decks
            commit: Whether to commit and refresh cards (default True)

        Returns:
            List of created Card instances
        """
        if not word_ids:
            return []

        # Fetch all words in a single query (fixes N+1 problem)
        words = (
            db.query(models.Word)
            .filter(models.Word.id.in_(word_ids))
            .all()
        )

        # Use the bulk creation method
        return CardService.bulk_create_cards_from_words(
            db=db,
            words=words,
            template_id=template_id,
            deck_id_override=deck_id_override,
            commit=commit
        )

    @staticmethod
    def bulk_create_cards_for_deck(
        db: Session,
        deck_id: str,
        template_id: Optional[str] = None,
        commit: bool = True
    ) -> List[models.Card]:
        """Create cards for all words in a deck.

        Args:
            db: Database session
            deck_id: Deck ID to create cards for
            template_id: Optional template ID (uses default if None)
            commit: Whether to commit and refresh cards (default True)

        Returns:
            List of created Card instances
        """
        # Fetch all words for the deck
        words = (
            db.query(models.Word)
            .filter(models.Word.deck_id == deck_id)
            .all()
        )

        # Use the bulk creation method
        return CardService.bulk_create_cards_from_words(
            db=db,
            words=words,
            template_id=template_id,
            commit=commit
        )
