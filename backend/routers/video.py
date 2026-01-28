"""
Video learning endpoints showcasing Gemini 3 multimodal capabilities.

This module provides API endpoints for:
- Video upload and processing
- Subtitle extraction and retrieval
- Vocabulary identification from videos
- Exercise generation from video content
- Video content management

All powered by Gemini 3's vision and reasoning models.
"""

import os
import json
import tempfile
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from services.auth import get_current_user
from services.database import get_db
from services.video_processor import VideoProcessor


router = APIRouter(prefix="/video", tags=["video"])
video_processor = VideoProcessor()

# Security constants
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/mov"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}


def validate_video_upload(file: UploadFile) -> None:
    """Validate video upload for security and size constraints."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}",
        )

    # Validate content type
    if file.content_type and file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Invalid content type: {file.content_type}"
        )


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    target_language: str = Form(...),
    native_language: str = Form("English"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload video for Gemini 3 multimodal analysis.

    Supports: MP4, WEBM, MOV (max 50MB)

    Args:
        file: Video file to upload
        target_language: Language in the video
        native_language: User's native language for translations
        current_user: Authenticated user
        db: Database session

    Returns:
        Complete video analysis including subtitles, vocabulary, and exercises
    """
    # Validate upload
    validate_video_upload(file)

    # Read file content
    file_content = await file.read()
    if len(file_content) > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_VIDEO_SIZE / (1024*1024)}MB",
        )

    # Save to temporary file for processing
    temp_file = None
    try:
        # Create temporary file with proper extension
        suffix = Path(file.filename or "video.mp4").suffix
        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=suffix, delete=False
        ) as temp_file:
            temp_path = temp_file.name
            temp_file.write(file_content)

        # Analyze with Gemini 3 Vision
        analysis = await video_processor.analyze_video(
            video_path=temp_path,
            target_language=target_language,
            native_language=native_language,
        )

        # Generate exercises with Gemini 3 Pro (better reasoning)
        exercises = await video_processor.generate_exercises_from_video(
            transcript=analysis.get("transcript", []),
            vocabulary=analysis.get("vocabulary", []),
            grammar_points=analysis.get("grammar_points", []),
            target_language=target_language,
        )

        # Save to database
        # Note: You'll need to create the video_content table schema
        # For now, returning the analysis directly
        return {
            "filename": file.filename,
            "target_language": target_language,
            "analysis": analysis,
            "exercises": exercises,
            "message": "Video analyzed successfully. Note: Database storage not yet implemented.",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Video processing failed: {str(e)}"
        )

    finally:
        # Cleanup temporary file
        if temp_file and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@router.post("/transcript")
async def extract_transcript(
    file: UploadFile = File(...),
    target_language: str = Form(...),
    current_user: models.User = Depends(get_current_user),
):
    """
    Extract just the transcript from a video (faster than full analysis).

    Args:
        file: Video file
        target_language: Language in the video
        current_user: Authenticated user

    Returns:
        Timestamped transcript
    """
    validate_video_upload(file)

    file_content = await file.read()
    if len(file_content) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    temp_file = None
    try:
        suffix = Path(file.filename or "video.mp4").suffix
        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=suffix, delete=False
        ) as temp_file:
            temp_path = temp_file.name
            temp_file.write(file_content)

        transcript_data = await video_processor.extract_audio_transcript(
            video_path=temp_path, target_language=target_language
        )

        return transcript_data

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Transcript extraction failed: {str(e)}"
        )

    finally:
        if temp_file and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


# Placeholder endpoints for future database integration
# These would be implemented once the video_content table is created

# @router.get("/{video_id}/subtitles")
# async def get_subtitles(
#     video_id: int,
#     current_user: models.User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Get timestamped subtitles for video player sync."""
#     video = db.query(models.VideoContent).filter(
#         models.VideoContent.id == video_id,
#         models.VideoContent.user_id == current_user.id
#     ).first()
#
#     if not video:
#         raise HTTPException(status_code=404, detail="Video not found")
#
#     return json.loads(video.transcript)


# @router.get("/{video_id}/vocabulary")
# async def get_video_vocabulary(
#     video_id: int,
#     current_user: models.User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Get vocabulary extracted from video with timestamps."""
#     video = db.query(models.VideoContent).filter(
#         models.VideoContent.id == video_id,
#         models.VideoContent.user_id == current_user.id
#     ).first()
#
#     if not video:
#         raise HTTPException(status_code=404, detail="Video not found")
#
#     return json.loads(video.vocabulary)


# @router.get("/{video_id}/exercises")
# async def get_video_exercises(
#     video_id: int,
#     current_user: models.User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Get auto-generated exercises for this video."""
#     video = db.query(models.VideoContent).filter(
#         models.VideoContent.id == video_id,
#         models.VideoContent.user_id == current_user.id
#     ).first()
#
#     if not video:
#         raise HTTPException(status_code=404, detail="Video not found")
#
#     return json.loads(video.exercises)


# @router.get("/")
# async def list_user_videos(
#     current_user: models.User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """List all videos uploaded by the current user."""
#     videos = db.query(models.VideoContent).filter(
#         models.VideoContent.user_id == current_user.id
#     ).order_by(models.VideoContent.created_at.desc()).all()
#
#     return videos


# @router.delete("/{video_id}")
# async def delete_video(
#     video_id: int,
#     current_user: models.User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Delete a video and all associated data."""
#     video = db.query(models.VideoContent).filter(
#         models.VideoContent.id == video_id,
#         models.VideoContent.user_id == current_user.id
#     ).first()
#
#     if not video:
#         raise HTTPException(status_code=404, detail="Video not found")
#
#     db.delete(video)
#     db.commit()
#
#     return {"message": "Video deleted successfully"}
