from uuid import uuid4
import models

# 1. Use 'authenticated_client' and 'test_user' fixtures
def test_vocab_capture_create_and_update(authenticated_client, db, test_user):
    # Setup: Create a deck belonging to the TEST USER
    deck = models.Deck(
        id=uuid4(),
        user_id=test_user.id,  # IMPORTANT: Must match the authenticated user
        name="Test Deck", 
        language="Spanish"
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)

    # Test API
    payload = {
        "term": "hola",
        "deck_id": str(deck.id),
        "context": "Hola, ¿cómo estás?",
        "analysis": {"translation": "hello"},
    }

    # Use authenticated_client here
    r = authenticated_client.post("/vocab/capture", json=payload)
    
    if r.status_code != 200:
        print(r.json())
        
    assert r.status_code == 200
    assert r.json()["action"] == "created"

    # Capture again (should update encounters)
    r2 = authenticated_client.post("/vocab/capture", json=payload)
    assert r2.status_code == 200
    assert r2.json()["action"] == "updated"


def test_dictionary_lookup_and_cache(client):
    # Dictionary lookup usually doesn't require auth, so 'client' is fine.
    # If it DOES require auth, switch to 'authenticated_client'.
    r = client.get(
        "/dictionary/lookup", params={"term": "hola", "target_language": "Spanish"}
    )
    
    if r.status_code == 200:
        first = r.json()
        
        r2 = client.get(
            "/dictionary/lookup", params={"term": "hola", "target_language": "Spanish"}
        )
        assert r2.status_code == 200
        second = r2.json()
        
        assert first.get("text") == second.get("text")


def test_bulk_card_generation(authenticated_client, db, test_user):
    # Setup Deck for the logged-in user
    deck = models.Deck(
        id=uuid4(),
        user_id=test_user.id, # Link to test_user
        name="BulkDeck", 
        language="Spanish"
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)

    # Setup Words
    words = []
    for t in ["uno", "dos", "tres"]:
        w = models.Word(
            id=uuid4(),
            deck_id=deck.id, 
            term=t, 
            context="count"
        )
        db.add(w)
        words.append(w)
    db.commit()

    ids = [str(w.id) for w in words]
    
    # Test Bulk Generation
    r = authenticated_client.post(
        "/words/cards/bulk_from_words", 
        json={"word_ids": ids, "deck_id": str(deck.id)}
    )
    
    if r.status_code != 200:
        print(r.json())

    assert r.status_code == 200
    created = r.json()
    assert len(created) == 3