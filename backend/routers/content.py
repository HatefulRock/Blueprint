from typing import Any, Dict, List, Union

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..services.database import get_db
from ..services.gemini import GeminiService
from ..services.web_scraper import WebScraper

router = APIRouter(prefix="/content", tags=["content"])


def extract_difficulty(analysis: Union[Dict[str, Any], List[Any]]) -> str:
    """Helper to safely extract difficulty from potential List or Dict."""
    data = {}
    if isinstance(analysis, list):
        if len(analysis) > 0:
            data = analysis[0]
    elif isinstance(analysis, dict):
        data = analysis

    return data.get("difficulty_level", "Unknown")


@router.post("/", response_model=schemas.ContentRead)
async def create_content(
    content_data: schemas.ContentCreate, db: Session = Depends(get_db)
):
    """Manually upload text for reading."""
    # Use Gemini to estimate difficulty before saving
    # We strip the text to 1000 chars to save tokens/latency
    analysis = GeminiService.analyze_text(
        content_data.content[:1000], "Target Language"
    )

    # FIX: Handle List vs Dict return type safely
    difficulty = extract_difficulty(analysis)

    new_content = models.ReadingContent(
        **content_data.dict(), difficulty_score=difficulty
    )
    db.add(new_content)
    db.commit()
    db.refresh(new_content)
    return new_content


@router.post("/import", response_model=schemas.ContentRead)
async def import_from_url(
    import_data: schemas.ContentImport, db: Session = Depends(get_db)
):
    """Scrape a URL, analyze it, and save it."""
    # 1. Scrape the URL
    scraped_data = WebScraper.scrape(import_data.url)
    if not scraped_data:
        raise HTTPException(status_code=400, detail="Could not scrape content from URL")

    # 2. Use Gemini to get a difficulty score
    analysis = GeminiService.analyze_text(
        scraped_data["text"][:1000], "Target Language"
    )

    # FIX: Handle List vs Dict return type safely
    difficulty = extract_difficulty(analysis)

    # 3. Save to DB
    new_content = models.ReadingContent(
        user_id=import_data.user_id,
        title=scraped_data["title"],
        content=scraped_data["text"],
        source_url=import_data.url,
        difficulty_score=difficulty,
    )
    db.add(new_content)
    db.commit()
    db.refresh(new_content)
    return new_content


@router.get("/user/{user_id}", response_model=List[schemas.ContentRead])
def get_user_content(user_id: int, db: Session = Depends(get_db)):
    """List all articles saved by a user."""
    return (
        db.query(models.ReadingContent)
        .filter(models.ReadingContent.user_id == user_id)
        .all()
    )


@router.get("/{content_id}", response_model=schemas.ContentRead)
def get_content_details(content_id: int, db: Session = Depends(get_db)):
    content = (
        db.query(models.ReadingContent)
        .filter(models.ReadingContent.id == content_id)
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


@router.delete("/{content_id}")
def delete_content(content_id: int, db: Session = Depends(get_db)):
    content = (
        db.query(models.ReadingContent)
        .filter(models.ReadingContent.id == content_id)
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    db.delete(content)
    db.commit()
    return {"message": "Content deleted"}
