import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.database import SessionLocal, engine, Base
from backend import models

client = TestClient(app)

# Use a fresh SQLite memory DB for tests if DATABASE_URL is not set; the app currently uses configured DB


@pytest.fixture(scope="module")
def db_setup():
    # Create tables in test DB
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_vocab_capture_create_and_update(db_setup):
    # Create a deck and then capture a word
    db = SessionLocal()
    deck = models.Deck(user_id=1, name="Test Deck", language="Test")
    db.add(deck)
    db.commit()
    db.refresh(deck)
    db.close()

    payload = {
        "term": "hola",
        "deck_id": deck.id,
        "context": "Hola, ¿cómo estás?",
        "analysis": {"translation": "hello"},
    }

    r = client.post("/vocab/capture", json=payload)
    assert r.status_code == 200
    assert r.json()["action"] == "created"

    # Capture again (should update encounters)
    r2 = client.post("/vocab/capture", json=payload)
    assert r2.status_code == 200
    assert r2.json()["action"] == "updated"


def test_dictionary_lookup_and_cache(db_setup):
    # Lookup a term and then lookup again to hit cache
    r = client.get(
        "/dictionary/lookup", params={"term": "hola", "target_language": "Test"}
    )
    assert r.status_code == 200
    first = r.json()

    r2 = client.get(
        "/dictionary/lookup", params={"term": "hola", "target_language": "Test"}
    )
    assert r2.status_code == 200
    second = r2.json()

    assert first["text"] == second["text"]


def test_bulk_card_generation(db_setup):
    # Create words and bulk generate cards
    db = SessionLocal()
    deck = models.Deck(user_id=1, name="BulkDeck", language="Test")
    db.add(deck)
    db.commit()
    db.refresh(deck)

    words = []
    for t in ["a", "b", "c"]:
        w = models.Word(deck_id=deck.id, term=t, context="x")
        db.add(w)
        words.append(w)
    db.commit()
    for w in words:
        db.refresh(w)

    ids = [w.id for w in words]
    r = client.post(
        "/words/cards/bulk_from_words", json={"word_ids": ids, "deck_id": deck.id}
    )
    assert r.status_code == 200
    created = r.json()
    assert len(created) == 3
