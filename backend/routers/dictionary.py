from fastapi import APIRouter, HTTPException
from typing import Optional
import schemas
from services.gemini import GeminiService
from functools import lru_cache
from services.cache import cache

router = APIRouter(prefix="/dictionary", tags=["dictionary"])


CACHE_TTL = 60 * 60 * 24  # 24 hours


def _make_key(term: str, target_language: str, native_language: Optional[str]):
    nl = native_language or ""
    return f"dict:{target_language}:{nl}:{term.lower()}"


@router.get("/lookup", response_model=schemas.DictionaryLookupResponse)
def lookup(
    term: str,
    target_language: str = "Chinese",
    native_language: Optional[str] = "English",
):
    """
    Lookup a dictionary entry. Results are cached using Redis if available, otherwise in-process memory.
    """
    key = _make_key(term, target_language, native_language)
    cached = cache.get(key)
    if cached:
        return cached

    try:
        result = GeminiService.analyze_text(term, target_language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    payload = {
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

    cache.set(key, payload, ttl=CACHE_TTL)
    return payload
