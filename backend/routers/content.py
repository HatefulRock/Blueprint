from typing import Any, Dict, List, Union
import tempfile
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from .. import models, schemas
from ..services.auth import get_current_user
from ..services.database import get_db
from ..services.gemini import GeminiService
from ..services.web_scraper import WebScraper
from ..services.file_parser import FileParser


router = APIRouter(prefix="/content", tags=["content"])

# Security constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_CONTENT_LENGTH = 1_000_000  # 1 million characters
ALLOWED_CONTENT_TYPES = {
    "application/pdf": [".pdf"],
    "text/plain": [".txt"],
}
ALLOWED_EXTENSIONS = {".pdf", ".txt"}


def sanitize_filename(filename: str) -> str:
    """Remove path traversal characters and limit filename length."""
    if not filename:
        return "uploaded_file"
    # Remove path components and dangerous characters
    name = Path(filename).name
    # Remove any remaining path separators
    name = name.replace("/", "").replace("\\", "").replace("..", "")
    # Limit length
    return name[:255] if name else "uploaded_file"


def validate_file_upload(file: UploadFile) -> None:
    """Validate file upload for security."""
    # Check filename
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    # Sanitize and validate extension
    safe_filename = sanitize_filename(file.filename)
    ext = Path(safe_filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate content type if provided
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        # Check if content type matches extension
        valid = False
        for allowed_type, extensions in ALLOWED_CONTENT_TYPES.items():
            if ext in extensions:
                valid = True
                break
        if not valid:
            raise HTTPException(
                status_code=400,
                detail=f"Content type mismatch. Got: {file.content_type}"
            )


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
    content_data: schemas.ContentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually upload text for reading."""
    # Validate content length
    if not content_data.content or len(content_data.content) < 50:
        raise HTTPException(
            status_code=400,
            detail="Content too short. Minimum 50 characters required."
        )

    if len(content_data.content) > MAX_CONTENT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Content too long. Maximum {MAX_CONTENT_LENGTH} characters allowed."
        )

    # Use Gemini to estimate difficulty before saving
    # We strip the text to 1000 chars to save tokens/latency
    analysis = GeminiService.analyze_text(
        content_data.content[:1000], "Target Language"
    )

    # FIX: Handle List vs Dict return type safely
    difficulty = extract_difficulty(analysis)

    # Remove user_id from content_data and use current_user.id
    data = content_data.dict()
    data.pop("user_id", None)
    new_content = models.ReadingContent(
        **data, user_id=current_user.id, difficulty_score=difficulty
    )
    db.add(new_content)
    db.commit()
    db.refresh(new_content)
    return new_content


@router.post("/import", response_model=schemas.ContentRead)
async def import_from_url(
    import_data: schemas.ContentImport,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Scrape a URL, analyze it, and save it."""
    # 1. Scrape the URL with optional language filtering
    scraped_data = WebScraper.scrape(import_data.url, target_language=import_data.target_language)
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
        user_id=current_user.id,
        title=scraped_data["title"],
        content=scraped_data["text"],
        source_url=import_data.url,
        difficulty_score=difficulty,
    )
    db.add(new_content)
    db.commit()
    db.refresh(new_content)
    return new_content


@router.post("/upload", response_model=schemas.ContentRead)
async def upload_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a PDF or text file, extract content, analyze and save."""
    # 1. Validate file upload
    validate_file_upload(file)

    # 2. Read file content with size limit
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024)}MB"
        )

    # 3. Extract text based on file type
    safe_filename = sanitize_filename(file.filename or "uploaded")
    ext = Path(safe_filename).suffix.lower()
    content_text = None

    if ext == ".pdf":
        # Use secure temporary file with context manager
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.pdf', delete=False) as tmp_file:
            tmp_path = tmp_file.name
            tmp_file.write(file_content)

        try:
            content_text = FileParser.extract_text_from_pdf(tmp_path)
        finally:
            # Ensure cleanup even if parsing fails
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    elif ext == ".txt":
        try:
            content_text = file_content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid UTF-8 encoding in text file"
            )

    if not content_text or len(content_text) < 50:
        raise HTTPException(
            status_code=400, detail="File contained no extractable text"
        )

    # 4. Enforce content length limit
    if len(content_text) > MAX_CONTENT_LENGTH:
        content_text = content_text[:MAX_CONTENT_LENGTH]

    # 5. Extract title heuristically
    title = FileParser.extract_title_from_text(content_text)

    # 6. Use Gemini to estimate difficulty
    analysis = GeminiService.analyze_text(content_text[:1000], "Target Language")
    difficulty = extract_difficulty(analysis)

    # 7. Save to DB
    new_content = models.ReadingContent(
        user_id=current_user.id,
        title=title,
        content=content_text,
        source_url=None,
        difficulty_score=difficulty,
    )
    db.add(new_content)
    db.commit()
    db.refresh(new_content)
    return new_content


@router.get("/", response_model=List[schemas.ContentRead])
def get_user_content(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all articles saved by a user."""
    return (
        db.query(models.ReadingContent)
        .filter(models.ReadingContent.user_id == current_user.id)
        .all()
    )


@router.get("/{content_id}", response_model=schemas.ContentRead)
def get_content_details(
    content_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = (
        db.query(models.ReadingContent)
        .filter(models.ReadingContent.id == content_id)
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return content


@router.delete("/{content_id}")
def delete_content(
    content_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = (
        db.query(models.ReadingContent)
        .filter(models.ReadingContent.id == content_id)
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(content)
    db.commit()
    return {"message": "Content deleted"}
