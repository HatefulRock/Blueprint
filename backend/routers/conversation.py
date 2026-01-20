import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ..services.database import get_db
from ..services.gemini import GeminiService
from .. import models, schemas

router = APIRouter(prefix="/conversation", tags=["conversation"])


@router.post("/message", response_model=schemas.ChatResponse)
async def chat_with_tutor(
    request: schemas.ChatRequest,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Handles text-based roleplay with feedback. Returns optional base64 TTS audio of the assistant reply.
    If session_id is provided, logs messages against that session; otherwise creates a new PracticeSession.
    """

    try:
        # Convert history for Gemini
        history = [{"role": m.role, "parts": [m.content]} for m in request.history]

        # Build a scenario prompt including tutor style and topic
        scenario_prompt = f"Roleplay scenario: {request.scenario}."
        if getattr(request, "topic", None):
            scenario_prompt += f" Topic: {request.topic}."
        system_instruction = f"You are a {request.tutor_style} {request.target_language} tutor. {scenario_prompt} Always respond in {request.target_language}. Return ONLY JSON with keys 'reply' and 'feedback'."

        # Use Gemini to generate the response
        response_obj = GeminiService.get_chat_response(
            user_text=request.text or "",
            target_language=request.target_language,
            scenario=system_instruction,
            history=history,
            tutor_style=request.tutor_style or "Friendly",
            topic=getattr(request, "topic", None),
        )

        # response_obj may already be a dict (GeminiService returns dict when possible)
        if isinstance(response_obj, str):
            try:
                data = json.loads(response_obj)
            except Exception:
                data = {"reply": response_obj, "feedback": None}
        else:
            data = response_obj

        # Award points for practicing
        user = db.query(models.User).filter(models.User.id == request.user_id).first()
        if user:
            user.points += 10
            db.commit()

        # Use existing session_id or create a new PracticeSession for this chat
        session = None
        if session_id:
            session = (
                db.query(models.PracticeSession)
                .filter(models.PracticeSession.id == int(session_id))
                .first()
            )
        if not session:
            try:
                session = models.PracticeSession(
                    user_id=request.user_id, session_type="chat", score=0
                )
                db.add(session)
                db.commit()
                db.refresh(session)
            except Exception:
                session = None

        # store messages if we have a session
        try:
            if session:
                um = models.ConversationMessage(
                    session_id=session.id, author="user", text=request.text or ""
                )
                am = models.ConversationMessage(
                    session_id=session.id, author="ai", text=data.get("reply") or ""
                )
                db.add_all([um, am])
                db.commit()
        except Exception:
            pass

        # Optionally produce TTS for the assistant reply
        tts_b64 = None
        if getattr(request, "voice", None) or True:
            # Always generate TTS by default; change logic if needed
            tts_b64 = GeminiService.text_to_speech(
                data.get("reply") or "",
                language=request.target_language,
                voice=getattr(request, "voice", None),
            )

        return schemas.ChatResponse(
            reply=data.get("reply"),
            feedback=data.get("feedback"),
            tts_base64=tts_b64,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio", response_model=schemas.ChatResponse)
async def voice_chat_with_tutor(
    user_id: int = Form(...),
    scenario: str = Form(...),
    target_language: str = Form(...),
    history_json: str = Form(...),
    audio_file: UploadFile = File(...),
    tutor_style: str = Form("Friendly"),
    topic: str | None = Form(None),
    voice: str | None = Form(None),
    session_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """Processes user audio, transcribes it, and responds.
    This endpoint also supports session-based logging when session_id is provided or will create one.
    """

    # 1. Save temp audio file
    temp_filename = f"temp_{uuid.uuid4()}.wav"
    with open(temp_filename, "wb") as buffer:
        buffer.write(await audio_file.read())

    try:
        history = json.loads(history_json)

        # 2. Call Gemini Audio Service
        # Note: We ask Gemini to transcribe, correct, and reply in one go
        result = GeminiService.process_audio_tutor(
            audio_file_path=temp_filename,
            target_language=target_language,
            conversation_history=history,
            tutor_style=tutor_style,
            topic=topic,
            voice=voice,
        )

        # result may be a dict or a JSON string
        if isinstance(result, dict):
            data = result
        else:
            try:
                data = json.loads(result)
            except Exception:
                data = {"transcription": None, "reply": result, "feedback": None}

        # 3. Award points
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user.points += 15  # More points for speaking!
            db.commit()

        # Ensure there's a session to attach messages
        session = None
        if session_id:
            session = (
                db.query(models.PracticeSession)
                .filter(models.PracticeSession.id == int(session_id))
                .first()
            )
        if not session:
            try:
                session = models.PracticeSession(
                    user_id=user.id if user else 0, session_type="chat", score=0
                )
                db.add(session)
                db.commit()
                db.refresh(session)
            except Exception:
                session = None

        # Store conversation messages
        try:
            if session:
                um = models.ConversationMessage(
                    session_id=session.id, author="user", text="(audio input)"
                )
                am = models.ConversationMessage(
                    session_id=session.id, author="ai", text=data.get("reply") or ""
                )
                db.add_all([um, am])
                db.commit()
        except Exception:
            pass

        # Generate TTS for assistant reply
        tts_b64 = None
        try:
            tts_b64 = GeminiService.text_to_speech(
                data.get("reply") or "", language=target_language, voice=voice
            )
        except Exception:
            tts_b64 = None

        return schemas.ChatResponse(
            transcription=data.get("transcription"),
            reply=data.get("reply"),
            feedback=data.get("feedback"),
            tts_base64=tts_b64,
        )

    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
