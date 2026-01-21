from ..services.queue import default_queue
from ..services.database import SessionLocal
from .. import models
from jinja2 import Template


def generate_cards_for_deck(deck_id: int, template_id: int | None = None):
    db = SessionLocal()
    template = None
    if template_id:
        template = (
            db.query(models.CardTemplate)
            .filter(models.CardTemplate.id == int(template_id))
            .first()
        )
    if not template:
        template = (
            db.query(models.CardTemplate)
            .filter(
                models.CardTemplate.name == "Basic", models.CardTemplate.user_id == None
            )
            .first()
        )

    words = db.query(models.Word).filter(models.Word.deck_id == int(deck_id)).all()
    created = []
    for w in words:
        ctx = {
            "term": w.term,
            "translation": w.translation,
            "context": w.context,
            "part_of_speech": w.part_of_speech,
            "literal_translation": w.literal_translation,
        }
        front = Template(template.front_template).render(**ctx) if template else w.term
        back = (
            Template(template.back_template).render(**ctx)
            if template
            else (w.translation or "")
        )
        card = models.Card(
            deck_id=deck_id,
            template_id=template.id if template else None,
            front=front,
            back=back,
            word_id=w.id,
        )
        db.add(card)
        created.append(card)

    db.commit()
    for c in created:
        db.refresh(c)
    db.close()
    return len(created)


# enqueue function


def enqueue_generate_cards_for_deck(deck_id: int, template_id: int | None = None):
    job = default_queue.enqueue(generate_cards_for_deck, deck_id, template_id)
    return job.get_id()


# Worker: generate cards given a list of word IDs
def generate_cards_for_word_ids(
    word_ids: list, template_id: int | None = None, deck_id: int | None = None
):
    db = SessionLocal()
    template = None
    if template_id:
        template = (
            db.query(models.CardTemplate)
            .filter(models.CardTemplate.id == int(template_id))
            .first()
        )
    if not template:
        template = (
            db.query(models.CardTemplate)
            .filter(
                models.CardTemplate.name == "Basic", models.CardTemplate.user_id == None
            )
            .first()
        )

    created = []
    for wid in word_ids:
        w = db.query(models.Word).filter(models.Word.id == int(wid)).first()
        if not w:
            continue
        ctx = {
            "term": w.term,
            "translation": w.translation,
            "context": w.context,
            "part_of_speech": w.part_of_speech,
            "literal_translation": w.literal_translation,
        }
        front = Template(template.front_template).render(**ctx) if template else w.term
        back = (
            Template(template.back_template).render(**ctx)
            if template
            else (w.translation or "")
        )
        card = models.Card(
            deck_id=deck_id or w.deck_id,
            template_id=template.id if template else None,
            front=front,
            back=back,
            word_id=w.id,
        )
        db.add(card)
        created.append(card)

    db.commit()
    for c in created:
        db.refresh(c)
    db.close()
    return len(created)


def enqueue_generate_cards_for_word_ids(
    word_ids: list, template_id: int | None = None, deck_id: int | None = None
):
    job = default_queue.enqueue(
        generate_cards_for_word_ids, word_ids, template_id, deck_id
    )
    return job.get_id()
