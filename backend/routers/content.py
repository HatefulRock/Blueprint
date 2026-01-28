import logging
import tempfile
import os
from pathlib import Path
from typing import Any, Dict, List, Union

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from .. import models, schemas
from ..services.auth import get_current_user
from ..services.database import get_db
from ..services.gemini import GeminiService
from ..services.web_scraper import WebScraper
from ..services.file_parser import FileParser

# Setup logger
logger = logging.getLogger("app.content")

router = APIRouter(prefix="/content", tags=["content"])

# Constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_CONTENT_LENGTH = 1_000_000 
ALLOWED_EXTENSIONS = {".pdf", ".txt"}

# --- Helpers ---

def verify_content_ownership(db: Session, content_id: str, user_id: str):
    """Verify existence and ownership of reading content."""
    content = db.query(models.ReadingContent).filter(models.ReadingContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Reading content not found")
    if str(content.user_id) != str(user_id):
        logger.warning(f"Unauthorized access: User {user_id} tried to access Content {content_id}")
        raise HTTPException(status_code=403, detail="Access denied")
    return content

def sanitize_filename(filename: str) -> str:
    if not filename: return "uploaded_file"
    name = Path(filename).name
    name = name.replace("/", "").replace("\\", "").replace("..", "")
    return name[:255]

def extract_difficulty(analysis: Union[Dict[str, Any], List[Any]]) -> str:
    data = {}
    if isinstance(analysis, list) and len(analysis) > 0:
        data = analysis[0]
    elif isinstance(analysis, dict):
        data = analysis
    return str(data.get("difficulty_level", "Unknown"))

# --- Endpoints ---

@router.post("/", response_model=schemas.ContentRead)
async def create_content(
    content_data: schemas.ContentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually create reading content."""
    text_len = len(content_data.content or "")
    if text_len < 50 or text_len > MAX_CONTENT_LENGTH:
        raise HTTPException(status_code=400, detail="Content length must be between 50 and 1M characters.")

    # Difficulty Analysis
    try:
        analysis = GeminiService.analyze_text(content_data.content[:1000], "Target Language")
        difficulty = extract_difficulty(analysis)
    except Exception as e:
        logger.error(f"Gemini analysis failed: {str(e)}")
        difficulty = "Unknown"

    try:
        new_content = models.ReadingContent(
            title=content_data.title,
            content=content_data.content,
            language=content_data.language,
            user_id=current_user.id,
            difficulty_score=difficulty
        )
        db.add(new_content)
        db.commit()
        db.refresh(new_content)
        logger.info(f"Content created: {new_content.id} by user {current_user.id}")
        return new_content
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"DB Error creating content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save content")

@router.post("/import", response_model=schemas.ContentRead)
async def import_from_url(
    import_data: schemas.ContentImport,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Scrape and analyze content from a URL."""
    try:
        scraped_data = WebScraper.scrape(import_data.url, target_language=import_data.target_language)
        if not scraped_data or not scraped_data.get("text"):
            raise HTTPException(status_code=400, detail="Could not extract text from URL")
        
        analysis = GeminiService.analyze_text(scraped_data["text"][:1000], "Target Language")
        difficulty = extract_difficulty(analysis)

        new_content = models.ReadingContent(
            user_id=current_user.id,
            title=scraped_data.get("title", "Imported Content"),
            content=scraped_data["text"],
            source_url=import_data.url,
            difficulty_score=difficulty,
        )
        db.add(new_content)
        db.commit()
        db.refresh(new_content)
        logger.info(f"URL imported: {import_data.url} to {new_content.id}")
        return new_content
    except HTTPException: raise
    except Exception as e:
        db.rollback()
        logger.error(f"URL Import failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Import failed")

@router.post("/upload", response_model=schemas.ContentRead)
async def upload_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload and parse a file (PDF/TXT)."""
    safe_name = sanitize_filename(file.filename)
    ext = Path(safe_name).suffix.lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Allowed types: .pdf, .txt")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (Max 10MB)")

    content_text = ""
    try:
        if ext == ".pdf":
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            try:
                content_text = FileParser.extract_text_from_pdf(tmp_path)
            finally:
                if os.path.exists(tmp_path): os.remove(tmp_path)
        else:
            content_text = file_bytes.decode("utf-8")
    except Exception as e:
        logger.error(f"File parsing error: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to parse file content")

    if not content_text or len(content_text) < 50:
        raise HTTPException(status_code=400, detail="Insufficient text extracted from file")

    analysis = GeminiService.analyze_text(content_text[:1000], "Target Language")
    
    try:
        new_content = models.ReadingContent(
            user_id=current_user.id,
            title=FileParser.extract_title_from_text(content_text) or safe_name,
            content=content_text[:MAX_CONTENT_LENGTH],
            difficulty_score=extract_difficulty(analysis),
        )
        db.add(new_content)
        db.commit()
        db.refresh(new_content)
        return new_content
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database save failed")

@router.get("/", response_model=List[schemas.ContentRead])
def get_user_content(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.ReadingContent).filter(
        models.ReadingContent.user_id == current_user.id
    ).all()

@router.get("/{content_id}", response_model=schemas.ContentRead)
def get_content_details(
    content_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return verify_content_ownership(db, content_id, current_user.id)

@router.delete("/{content_id}")
def delete_content(
    content_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = verify_content_ownership(db, content_id, current_user.id)
    try:
        db.delete(content)
        db.commit()
        logger.info(f"Content deleted: {content_id}")
        return {"message": "Content deleted"}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Delete failed")

@router.post("/analyze-long")
async def analyze_long_content(
    payload: Dict[str, Any],
    current_user: models.User = Depends(get_current_user),
):
    """High-context analysis using Gemini's long-context window."""
    text = payload.get("text", "")
    if not text or len(text) < 100:
        raise HTTPException(status_code=400, detail="Text too short for analysis")

    try:
        logger.info(f"Long-content analysis started for user {current_user.id} (len: {len(text)})")
        analysis = await GeminiService.analyze_long_content(
            text=text,
            target_language=payload.get("target_language", "Target"),
            native_language=payload.get("native_language", "Native")
        )
        return analysis
    except Exception as e:
        logger.error(f"Long analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail="AI Analysis failed")