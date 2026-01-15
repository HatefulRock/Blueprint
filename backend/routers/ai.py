from fastapi import APIRouter, HTTPException
from ..services.gemini import GeminiService
from .. import schemas

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/analyze", response_model=schemas.AnalysisResponse)
async def analyze_text(request: schemas.AnalysisRequest):
    """
    Called when a user highlights a word or sentence in the ReaderView.
    Returns a full linguistic breakdown.
    """
    try:
        analysis = GeminiService.analyze_text(
            request.text,
            request.target_language
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
