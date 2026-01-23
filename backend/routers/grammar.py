from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
import os
from datetime import datetime

from google import genai
from google.genai import types

from .. import models, schemas
from ..services.auth import get_current_user
from ..services.database import get_db

router = APIRouter(prefix="/grammar", tags=["grammar"])


@router.post("/generate", response_model=schemas.GrammarExerciseSetRead)
async def generate_exercises(
    request: schemas.GenerateExercisesRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate grammar exercises from provided text using Gemini AI.

    Args:
        request: Text and parameters for exercise generation

    Returns:
        Exercise set with generated exercises
    """
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        # Create prompt for Gemini
        prompt = f"""You are an expert {request.language} grammar teacher.

Generate {request.num_exercises} diverse grammar exercises based on this text:

"{request.text}"

Create exercises of these types: {', '.join(request.exercise_types)}

Exercise Type Definitions:
- fill_blank: Remove a word and ask user to fill it in (underline shown as _____)
- transformation: Transform a sentence (e.g., present to past tense, statement to question)
- multiple_choice: Provide 4 options, only 1 correct
- correction: Present an incorrect sentence, ask user to correct it

Return ONLY a JSON object with this structure:
{{
  "title": "Grammar Practice: [topic]",
  "difficulty_level": "A1/A2/B1/B2/C1/C2",
  "exercises": [
    {{
      "exercise_type": "fill_blank" | "transformation" | "multiple_choice" | "correction",
      "question": "The question/prompt text (use _____ for blanks)",
      "correct_answer": "The correct answer",
      "options": ["option1", "option2", "option3", "option4"] (only for multiple_choice, otherwise null),
      "explanation": "Brief explanation of the grammar rule",
      "grammar_point": "Name of grammar concept (e.g., 'present tense', 'ser vs estar')"
    }}
  ]
}}

Make exercises progressively challenging. Focus on grammar patterns from the text.
Ensure variety in exercise types and grammar points covered.
"""

        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )

        result = json.loads(response.text)

        # Create exercise set
        exercise_set = models.GrammarExerciseSet(
            user_id=current_user.id,
            title=result.get("title", f"Grammar Practice - {request.language}"),
            language=request.language,
            difficulty_level=result.get("difficulty_level"),
            source_text=request.text[:500],  # Store first 500 chars
            total_exercises=len(result.get("exercises", [])),
            completed_exercises=0,
        )

        db.add(exercise_set)
        db.flush()  # Get the ID

        # Create individual exercises
        for ex_data in result.get("exercises", []):
            exercise = models.GrammarExercise(
                exercise_set_id=exercise_set.id,
                exercise_type=ex_data.get("exercise_type"),
                question=ex_data.get("question"),
                correct_answer=ex_data.get("correct_answer"),
                options=json.dumps(ex_data.get("options"))
                if ex_data.get("options")
                else None,
                explanation=ex_data.get("explanation"),
                grammar_point=ex_data.get("grammar_point"),
            )
            db.add(exercise)

        db.commit()
        db.refresh(exercise_set)

        return exercise_set

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Exercise generation failed: {str(e)}"
        )


@router.get("/sets", response_model=List[schemas.GrammarExerciseSetRead])
async def get_exercise_sets(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all exercise sets for the current user."""
    sets = (
        db.query(models.GrammarExerciseSet)
        .filter(models.GrammarExerciseSet.user_id == current_user.id)
        .order_by(models.GrammarExerciseSet.created_at.desc())
        .all()
    )

    return sets


@router.get("/sets/{set_id}", response_model=schemas.GrammarExerciseSetRead)
async def get_exercise_set(
    set_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific exercise set with all exercises."""
    exercise_set = (
        db.query(models.GrammarExerciseSet)
        .filter(models.GrammarExerciseSet.id == set_id)
        .first()
    )

    if not exercise_set:
        raise HTTPException(status_code=404, detail="Exercise set not found")

    if exercise_set.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return exercise_set


@router.post("/check", response_model=schemas.CheckAnswerResponse)
async def check_answer(
    request: schemas.CheckAnswerRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Check if user's answer is correct.

    Args:
        request: Exercise ID and user's answer

    Returns:
        Whether answer is correct, with explanation
    """
    exercise = (
        db.query(models.GrammarExercise)
        .filter(models.GrammarExercise.id == request.exercise_id)
        .first()
    )

    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # Check ownership through exercise_set
    exercise_set = (
        db.query(models.GrammarExerciseSet)
        .filter(models.GrammarExerciseSet.id == exercise.exercise_set_id)
        .first()
    )

    if not exercise_set or exercise_set.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Normalize answers for comparison (trim, lowercase)
    user_answer_normalized = request.user_answer.strip().lower()
    correct_answer_normalized = exercise.correct_answer.strip().lower()

    is_correct = user_answer_normalized == correct_answer_normalized

    # Update exercise stats
    exercise.attempts += 1
    if is_correct:
        exercise.correct_attempts += 1
    exercise.last_attempted = datetime.utcnow()

    # Record attempt
    attempt = models.GrammarExerciseAttempt(
        user_id=current_user.id,
        exercise_id=exercise.id,
        user_answer=request.user_answer,
        is_correct=1 if is_correct else 0,
    )
    db.add(attempt)

    # Update set completion stats
    if is_correct:
        # Check if this is first correct attempt for this exercise
        previous_correct = (
            db.query(models.GrammarExerciseAttempt)
            .filter(
                models.GrammarExerciseAttempt.exercise_id == exercise.id,
                models.GrammarExerciseAttempt.user_id == current_user.id,
                models.GrammarExerciseAttempt.is_correct == 1,
            )
            .count()
        )

        if previous_correct == 0:  # First time getting this exercise correct
            exercise_set.completed_exercises += 1

    db.commit()

    return {
        "is_correct": is_correct,
        "correct_answer": exercise.correct_answer,
        "explanation": exercise.explanation or "",
        "user_answer": request.user_answer,
    }


@router.delete("/sets/{set_id}")
async def delete_exercise_set(
    set_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an exercise set."""
    exercise_set = (
        db.query(models.GrammarExerciseSet)
        .filter(models.GrammarExerciseSet.id == set_id)
        .first()
    )

    if not exercise_set:
        raise HTTPException(status_code=404, detail="Exercise set not found")

    if exercise_set.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(exercise_set)
    db.commit()

    return {"message": "Exercise set deleted successfully"}


@router.get("/sets/{set_id}/progress")
async def get_exercise_progress(
    set_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed progress for an exercise set."""
    exercise_set = (
        db.query(models.GrammarExerciseSet)
        .filter(models.GrammarExerciseSet.id == set_id)
        .first()
    )

    if not exercise_set:
        raise HTTPException(status_code=404, detail="Exercise set not found")

    if exercise_set.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Calculate detailed stats
    total_attempts = sum(ex.attempts for ex in exercise_set.exercises)
    total_correct = sum(ex.correct_attempts for ex in exercise_set.exercises)

    accuracy = (
        (total_correct / total_attempts * 100) if total_attempts > 0 else 0
    )

    return {
        "set_id": set_id,
        "total_exercises": exercise_set.total_exercises,
        "completed_exercises": exercise_set.completed_exercises,
        "total_attempts": total_attempts,
        "correct_attempts": total_correct,
        "accuracy": round(accuracy, 1),
        "completion_percentage": round(
            (exercise_set.completed_exercises / exercise_set.total_exercises * 100)
            if exercise_set.total_exercises > 0
            else 0,
            1,
        ),
    }
