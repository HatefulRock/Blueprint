from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from ..services.gemini import GeminiService
from .. import schemas
import tempfile
import os

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/analyze", response_model=schemas.AnalysisResponse)
async def analyze_text(request: schemas.AnalysisRequest):
    """
    Called when a user highlights a word or sentence in the ReaderView.
    Returns a full linguistic breakdown with optional context.
    """
    try:
        analysis = GeminiService.analyze_text(
            request.text,
            request.target_language,
            context_sentence=request.context_sentence
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Analysis failed: {str(e)}")

@router.post("/explain-grammar")
async def explain_grammar(request: schemas.ExplanationRequest):
    """
    Provides a deeper dive into a specific grammar rule found in a sentence.
    """
    prompt = f"""
    In the {request.target_language} sentence: "{request.text}"
    Explain the following grammar point: {request.grammar_point}
    Provide examples of how this rule works in other contexts.
    """

    try:
        # We use the raw chat model for a more conversational explanation
        response = GeminiService.get_chat_response(
            prompt,
            request.target_language,
            "Language Teacher"
        )
        return {"explanation": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simplify")
async def simplify_text(text: str, target_language: str):
    """
    Rewrites a difficult sentence into a simpler version (e.g., C1 -> A2 level).
    """
    prompt = f"Rewrite this {target_language} text to be much simpler (A2 level): {text}"
    try:
        response = GeminiService.get_chat_response(
            prompt,
            target_language,
            "Helpful Assistant"
        )
        return {"simplified_text": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import StreamingResponse

@router.get("/analyze/stream")
async def analyze_stream(text: str, target_language: str):
    return StreamingResponse(
        GeminiService.analyze_text_stream(text, target_language),
        media_type="text/event-stream"
    )


@router.post("/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    target_language: str = Form(...),
    expected_text: str = Form(None)
):
    """
    Transcribe audio file using Gemini STT and optionally provide pronunciation feedback.

    Args:
        audio_file: Audio file (WAV, MP3, WEBM, etc.)
        target_language: Target language for transcription
        expected_text: Optional text to compare against for pronunciation feedback

    Returns:
        JSON with transcription and optional pronunciation feedback
    """
    # Validate file size (max 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024

    try:
        # Read file content
        audio_content = await audio_file.read()

        if len(audio_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Audio file too large. Maximum size: {MAX_FILE_SIZE / (1024*1024)}MB"
            )

        # Save to temporary file
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.audio', delete=False) as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.write(audio_content)

        try:
            # Use process_audio_tutor to transcribe
            # We pass empty history since we just want transcription
            result = GeminiService.process_audio_tutor(
                audio_file_path=tmp_path,
                target_language=target_language,
                conversation_history=[],
                tutor_style="Pronunciation Coach",
                topic="Pronunciation Practice"
            )

            transcription = result.get("transcription", "")
            feedback = result.get("feedback", "")

            # If expected text provided, add comparison analysis
            pronunciation_analysis = None
            if expected_text and transcription:
                pronunciation_analysis = _analyze_pronunciation(
                    transcription,
                    expected_text,
                    feedback
                )

            return {
                "transcription": transcription,
                "feedback": feedback,
                "pronunciation_analysis": pronunciation_analysis
            }

        finally:
            # Clean up temporary file
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


def _analyze_pronunciation(transcription: str, expected: str, gemini_feedback: str):
    """
    Compare transcription with expected text to provide pronunciation analysis.

    Args:
        transcription: What was actually said (from STT)
        expected: What should have been said
        gemini_feedback: Feedback from Gemini

    Returns:
        Dictionary with pronunciation analysis
    """
    # Simple word-by-word comparison
    transcribed_words = transcription.lower().split()
    expected_words = expected.lower().split()

    # Calculate accuracy
    correct_words = sum(1 for i, word in enumerate(expected_words)
                       if i < len(transcribed_words) and transcribed_words[i] == word)

    accuracy = (correct_words / len(expected_words) * 100) if expected_words else 0

    # Identify mismatches
    mismatched_words = []
    for i, expected_word in enumerate(expected_words):
        if i >= len(transcribed_words) or transcribed_words[i] != expected_word:
            actual = transcribed_words[i] if i < len(transcribed_words) else "(missing)"
            mismatched_words.append({
                "expected": expected_word,
                "actual": actual,
                "position": i + 1
            })

    return {
        "accuracy": round(accuracy, 1),
        "score": int(accuracy),
        "expected_text": expected,
        "transcribed_text": transcription,
        "mismatched_words": mismatched_words,
        "gemini_feedback": gemini_feedback
    }
