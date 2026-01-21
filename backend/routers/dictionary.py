from fastapi import APIRouter, HTTPException
from typing import Optional
from .. import schemas
from ..services.gemini import GeminiService
from functools import lru_cache

router = APIRouter(prefix="/dictionary", tags=["dictionary"])


# Simple in-memory LRU cache for dictionary lookups. Size tuned for typical session.
@lru_cache(maxsize=2048)
def _cached_lookup(term: str, target_language: str, native_language: Optional[str]):
    # Use backend AI service to perform lookup
    try:
        result = GeminiService.analyze_text(term, target_language)
        # Normalize to our DictionaryLookupResponse structure roughly
        return {
            "text": term,
            "type": "word",
            "target_language": target_language,
            "native_language": native_language,
            "entry": {
                "term": term,
                "translation": result.get("translation")
                if isinstance(result, dict)
                else None,
                "part_of_speech": result.get("part_of_speech")
                if isinstance(result, dict)
                else None,
                "source": "gemini",
            },
            "raw": result if isinstance(result, dict) else {"raw": str(result)},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lookup", response_model=schemas.DictionaryLookupResponse)
def lookup(
    term: str,
    target_language: str = "Chinese",
    native_language: Optional[str] = "English",
):
    """
    Lookup a dictionary entry. Results are cached in-process with LRU.
    """
    return _cached_lookup(term, target_language, native_language)
