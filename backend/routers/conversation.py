from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import tempfile
import os
import logging
import json
from uuid import UUID

import models
import schemas
from services.database import get_db
from services.gemini import GeminiService
from config.gemini_models import GEMINI_MODELS
from services.auth import get_current_user

logger = logging.getLogger("conversation_router")

router = APIRouter(prefix="/conversation", tags=["conversation"])

# Get API key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


@router.post("/message", response_model=schemas.ChatResponse)
async def send_message(request: schemas.ChatRequest):
    """
    Send a text message to the AI tutor and get a response.
    Uses the backend Gemini API key.
    """
    logger.info(f"Conversation message received. Target: {request.target_language}, Scenario: {request.scenario}")

    try:
        # Convert history to format expected by GeminiService
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in (request.history or [])
        ]

        response = GeminiService.get_chat_response(
            user_text=request.text or "",
            target_language=request.target_language,
            scenario=request.scenario,
            history=history,
            tutor_style=getattr(request, 'tutor_style', 'Friendly'),
            topic=getattr(request, 'topic', None),
        )

        return schemas.ChatResponse(
            reply=response.get("reply", ""),
            feedback=response.get("feedback"),
            transcription=None,
            tts_base64=None,
        )
    except Exception as e:
        logger.error(f"Conversation message failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Conversation failed: {str(e)}")


@router.post("/audio", response_model=schemas.ChatResponse)
async def send_audio(
    audio_file: UploadFile = File(...),
    user_id: str = Form(...),
    scenario: str = Form(...),
    target_language: str = Form(...),
    history_json: str = Form("[]"),
):
    """
    Send audio to the AI tutor and get a response with transcription and feedback.
    Uses the backend Gemini API key.
    """
    logger.info(f"Conversation audio received. Target: {target_language}, Scenario: {scenario}")

    try:
        import json
        history = json.loads(history_json) if history_json else []

        # Save audio to temp file
        audio_content = await audio_file.read()
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.wav', delete=False) as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.write(audio_content)

        try:
            # Process with Gemini
            result = GeminiService.process_audio_tutor(
                audio_file_path=tmp_path,
                target_language=target_language,
                conversation_history=history,
                tutor_style="Friendly",
                topic=scenario,
            )

            return schemas.ChatResponse(
                reply=result.get("reply", ""),
                feedback=result.get("feedback"),
                transcription=result.get("transcription"),
                tts_base64=None,
            )
        finally:
            # Clean up temp file
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    except Exception as e:
        logger.error(f"Conversation audio failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")


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


@router.get("/live-config")
async def get_live_config():
    """
    Returns configuration needed for frontend to connect directly to Gemini Live.
    This keeps the API key on the backend while allowing frontend direct connection.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")

    return {
        "apiKey": GEMINI_API_KEY,
        "model": GEMINI_MODELS["live"],
    }


# --- Session Persistence Endpoints ---

@router.post("/sessions", response_model=schemas.ConversationSessionRead)
async def create_session(
    request: schemas.ConversationSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new conversation session."""
    session = models.ConversationSession(
        user_id=current_user.id,
        scenario=request.scenario,
        target_language=request.target_language,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=List[schemas.ConversationSessionListItem])
async def list_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
):
    """List user's conversation sessions with message counts."""
    sessions = (
        db.query(
            models.ConversationSession,
            func.count(models.ConversationMessage.id).label("message_count")
        )
        .outerjoin(models.ConversationMessage)
        .filter(models.ConversationSession.user_id == current_user.id)
        .group_by(models.ConversationSession.id)
        .order_by(models.ConversationSession.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        schemas.ConversationSessionListItem(
            id=session.id,
            scenario=session.scenario,
            target_language=session.target_language,
            created_at=session.created_at,
            message_count=message_count,
        )
        for session, message_count in sessions
    ]


@router.get("/sessions/{session_id}", response_model=schemas.ConversationSessionRead)
async def get_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific conversation session with messages."""
    session = (
        db.query(models.ConversationSession)
        .filter(
            models.ConversationSession.id == session_id,
            models.ConversationSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session


@router.post("/sessions/{session_id}/messages")
async def save_messages(
    session_id: UUID,
    messages: List[schemas.ConversationMessageCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Save a batch of messages to a conversation session."""
    session = (
        db.query(models.ConversationSession)
        .filter(
            models.ConversationSession.id == session_id,
            models.ConversationSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    for msg in messages:
        db_message = models.ConversationMessage(
            session_id=session_id,
            author=msg.author,
            text=msg.text,
        )
        db.add(db_message)

    db.commit()

    return {"status": "ok", "saved": len(messages)}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a conversation session."""
    session = (
        db.query(models.ConversationSession)
        .filter(
            models.ConversationSession.id == session_id,
            models.ConversationSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.commit()

    return {"status": "ok"}
