from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from services.gemini import GeminiService
import schemas
import tempfile
import os
import logging
from fastapi.responses import StreamingResponse

logger = logging.getLogger("ai_router")

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/analyze", response_model=schemas.AnalysisResponse)
async def analyze_text(request: schemas.AnalysisRequest):
    """
    Called when a user highlights a word or sentence in the ReaderView.
    Returns a full linguistic breakdown with optional context.
    """
    logger.info(f"Analyzing text snippet. Length: {len(request.text)} chars. Target Lang: {request.target_language}")
    try:
        analysis = GeminiService.analyze_text(
            request.text,
            request.target_language,
            context_sentence=request.context_sentence
        )
        logger.info("Text analysis successful")
        return analysis
    except Exception as e:
        logger.error(f"AI Analysis failed for text: '{request.text[:50]}...'", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI Analysis failed: {str(e)}")

@router.post("/explain-grammar")
async def explain_grammar(request: schemas.ExplanationRequest):
    """
    Provides a deeper dive into a specific grammar rule found in a sentence.
    """
    logger.info(f"Grammar explanation requested for point: '{request.grammar_point}'")
    
    prompt = f"""
    In the {request.target_language} sentence: "{request.text}"
    Explain the following grammar point: {request.grammar_point}
    Provide examples of how this rule works in other contexts.
    """

    try:
        response = GeminiService.get_chat_response(
            prompt,
            request.target_language,
            "Language Teacher"
        )
        return {"explanation": response}
    except Exception as e:
        logger.error(f"Grammar explanation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simplify")
async def simplify_text(text: str, target_language: str):
    """
    Rewrites a difficult sentence into a simpler version (e.g., C1 -> A2 level).
    """
    logger.info(f"Simplification requested for text length: {len(text)}")
    prompt = f"Rewrite this {target_language} text to be much simpler (A2 level): {text}"
    try:
        response = GeminiService.get_chat_response(
            prompt,
            target_language,
            "Helpful Assistant"
        )
        return {"simplified_text": response}
    except Exception as e:
        logger.error("Simplification failed", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze/stream")
async def analyze_stream(text: str, target_language: str):
    logger.info(f"Streaming analysis started for text length: {len(text)}")
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
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    logger.info(f"Transcription request received. File: {audio_file.filename}, Target: {target_language}")

    try:
        # Read file content
        audio_content = await audio_file.read()
        file_size = len(audio_content)
        
        logger.info(f"Audio file read. Size: {file_size} bytes")

        if file_size > MAX_FILE_SIZE:
            logger.warning(f"File upload rejected. Size {file_size} exceeds limit {MAX_FILE_SIZE}")
            raise HTTPException(
                status_code=400,
                detail=f"Audio file too large. Maximum size: {MAX_FILE_SIZE / (1024*1024)}MB"
            )

        # Save to temporary file
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.audio', delete=False) as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.write(audio_content)
            logger.debug(f"Temp file created at: {tmp_path}")

        try:
            # Use process_audio_tutor to transcribe
            logger.info("Sending audio to GeminiService...")
            result = GeminiService.process_audio_tutor(
                audio_file_path=tmp_path,
                target_language=target_language,
                conversation_history=[],
                tutor_style="Pronunciation Coach",
                topic="Pronunciation Practice"
            )

            transcription = result.get("transcription", "")
            feedback = result.get("feedback", "")
            
            logger.info(f"Gemini response received. Transcription length: {len(transcription)}")

            # If expected text provided, add comparison analysis
            pronunciation_analysis = None
            if expected_text and transcription:
                pronunciation_analysis = _analyze_pronunciation(
                    transcription,
                    expected_text,
                    feedback
                )
                logger.info(f"Pronunciation analysis complete. Score: {pronunciation_analysis.get('score')}")

            return {
                "transcription": transcription,
                "feedback": feedback,
                "pronunciation_analysis": pronunciation_analysis
            }

        finally:
            # Clean up temporary file
            try:
                os.remove(tmp_path)
                logger.debug(f"Temp file removed: {tmp_path}")
            except Exception as e:
                logger.warning(f"Failed to remove temp file {tmp_path}: {e}")

    except HTTPException as he:
        # Re-raise HTTP exceptions without logging as errors (since they are handled logic flow)
        raise he
    except Exception as e:
        logger.error("Critical error during transcription process", exc_info=True)
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
