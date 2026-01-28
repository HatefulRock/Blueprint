from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models

from services.database import get_db

router = APIRouter()


@router.get("/session/{session_id}")
def get_conversation_session(session_id: int, db: Session = Depends(get_db)):
    """Return conversation messages for a session id in chronological order."""
    msgs = (
        db.query(models.ConversationMessage)
        .filter(models.ConversationMessage.session_id == int(session_id))
        .order_by(models.ConversationMessage.timestamp.asc())
        .all()
    )

    return [
        {
            "id": m.id,
            "author": m.author,
            "text": m.text,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
        }
        for m in msgs
    ]
