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
async def chat_with_tutor(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    """Handles text-based roleplay with feedback."""

    # Custom prompt to force Gemini to provide feedback AND a reply
    system_instruction = f"""
    You are a friendly {request.target_language} tutor.
    Roleplay scenario: {request.scenario}.
    If the user makes a mistake in {request.target_language}, provide a brief correction in English.
    Always respond in {request.target_language} to keep the conversation going.
    Format your response as JSON with two keys: "reply" and "feedback".
    """

    try:
        # Convert history for Gemini
        history = [{"role": m.role, "parts": [m.content]} for m in request.history]

        # Use Gemini to generate the response
        response_text = GeminiService.get_chat_response(
            user_text=request.text,
            target_language=request.target_language,
            scenario=system_instruction,
            history=history
        )

        # Parse the JSON from Gemini
        data = json.loads(response_text)

        # Award points for practicing
        user = db.query(models.User).filter(models.User.id == request.user_id).first()
        if user:
            user.points += 10
            db.commit()

        return schemas.ChatResponse(
            reply=data.get("reply"),
            feedback=data.get("feedback")
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
    db: Session = Depends(get_db)
):
    """Processes user audio, transcribes it, and responds."""

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
            conversation_history=history
        )

        # Result from process_audio_tutor should be parsed similarly to the text route
        data = json.loads(result)

        # 3. Award points
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user.points += 15 # More points for speaking!
            db.commit()

        return schemas.ChatResponse(
            transcription=data.get("transcription"),
            reply=data.get("reply"),
            feedback=data.get("feedback")
        )

    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
