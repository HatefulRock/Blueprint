from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from .. import models, schemas
from ..services.auth import get_current_user
from ..services.database import get_db
from ..services.gemini import GeminiService

router = APIRouter(prefix="/writing", tags=["writing"])


@router.post("/check-grammar", response_model=schemas.GrammarCheckResponse)
async def check_grammar(
    request: schemas.GrammarCheckRequest,
    current_user: models.User = Depends(get_current_user),
):
    """
    Check grammar and spelling using Gemini AI.

    Args:
        request: Text and language to check

    Returns:
        Corrected text with detailed corrections and explanations
    """
    try:
        # Use Gemini to check grammar
        from google import genai
        from google.genai import types
        import os

        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        prompt = f"""You are an expert {request.language} grammar teacher.

Analyze the following text for grammar, spelling, and punctuation errors:

"{request.text}"

Return ONLY a JSON object with these keys:
- corrected_text: The fully corrected version of the text
- corrections: An array of objects, each with:
  - position: The word or phrase position (approximate)
  - original: The incorrect text
  - correction: The corrected text
  - explanation: Why it's wrong and how to fix it
- feedback: Overall feedback on the writing quality (2-3 sentences)

If there are no errors, return corrections as an empty array and corrected_text same as original.
"""

        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )

        result = json.loads(response.text)

        return {
            "original_text": request.text,
            "corrected_text": result.get("corrected_text", request.text),
            "corrections": result.get("corrections", []),
            "feedback": result.get("feedback", ""),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Grammar check failed: {str(e)}"
        )


@router.post("/feedback", response_model=schemas.EssayFeedbackResponse)
async def get_essay_feedback(
    request: schemas.EssayFeedbackRequest,
    current_user: models.User = Depends(get_current_user),
):
    """
    Get comprehensive feedback on writing using Gemini AI.

    Args:
        request: Text, language, and submission type

    Returns:
        Detailed feedback including score, strengths, and improvement areas
    """
    try:
        from google import genai
        from google.genai import types
        import os

        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        prompt = f"""You are an expert {request.language} writing teacher.

Provide comprehensive feedback on this {request.submission_type}:

"{request.text}"

Return ONLY a JSON object with these keys:
- score: Overall quality score (0-100)
- strengths: Array of 2-4 specific strengths (what they did well)
- areas_for_improvement: Array of 2-4 specific areas to improve
- vocabulary_suggestions: Array of 2-3 objects with {{word: "basic word", suggestion: "advanced alternative", context: "how to use it"}}
- grammar_notes: Brief note on grammar quality (1-2 sentences)
- overall_feedback: Encouraging summary paragraph (3-5 sentences)

Be constructive, specific, and encouraging. Tailor feedback to a language learner.
"""

        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )

        result = json.loads(response.text)

        return {
            "score": result.get("score", 70),
            "strengths": result.get("strengths", []),
            "areas_for_improvement": result.get("areas_for_improvement", []),
            "vocabulary_suggestions": result.get("vocabulary_suggestions", []),
            "grammar_notes": result.get("grammar_notes", ""),
            "overall_feedback": result.get("overall_feedback", ""),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Feedback generation failed: {str(e)}"
        )


@router.post("/", response_model=schemas.WritingSubmissionRead)
async def create_submission(
    submission: schemas.WritingSubmissionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new writing submission."""
    # Calculate word count
    word_count = len(submission.content.split())

    new_submission = models.WritingSubmission(
        user_id=current_user.id,
        title=submission.title,
        content=submission.content,
        prompt=submission.prompt,
        word_count=word_count,
        language=submission.language,
        submission_type=submission.submission_type,
    )

    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    return new_submission


@router.get("/", response_model=List[schemas.WritingSubmissionRead])
async def get_user_submissions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all writing submissions for the current user."""
    submissions = (
        db.query(models.WritingSubmission)
        .filter(models.WritingSubmission.user_id == current_user.id)
        .order_by(models.WritingSubmission.created_at.desc())
        .all()
    )

    return submissions


@router.get("/{submission_id}", response_model=schemas.WritingSubmissionRead)
async def get_submission(
    submission_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific writing submission."""
    submission = (
        db.query(models.WritingSubmission)
        .filter(models.WritingSubmission.id == submission_id)
        .first()
    )

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return submission


@router.patch("/{submission_id}", response_model=schemas.WritingSubmissionRead)
async def update_submission(
    submission_id: int,
    update: schemas.WritingSubmissionUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a writing submission with feedback."""
    submission = (
        db.query(models.WritingSubmission)
        .filter(models.WritingSubmission.id == submission_id)
        .first()
    )

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update fields
    for field, value in update.dict(exclude_unset=True).items():
        setattr(submission, field, value)

    # Recalculate word count if content changed
    if update.content:
        submission.word_count = len(update.content.split())

    db.commit()
    db.refresh(submission)

    return submission


@router.delete("/{submission_id}")
async def delete_submission(
    submission_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a writing submission."""
    submission = (
        db.query(models.WritingSubmission)
        .filter(models.WritingSubmission.id == submission_id)
        .first()
    )

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(submission)
    db.commit()

    return {"message": "Submission deleted successfully"}
