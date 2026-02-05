"""
Diagnostic/Placement Test Router

Generates and scores placement tests to assess user's language level.
Uses Gemini AI to create level-appropriate questions spanning A1 to C1.
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from google import genai
from google.genai import types

import models
from services.auth import get_current_user
from services.database import get_db
from config.gemini_models import GEMINI_MODELS

logger = logging.getLogger("app.diagnostic")

router = APIRouter(prefix="/diagnostic", tags=["diagnostic"])


# --- Schemas ---
class DiagnosticQuestion(BaseModel):
    id: int
    level: str  # A1, A2, B1, B2, C1
    type: str  # multiple_choice, fill_blank, translation
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str


class DiagnosticTestResponse(BaseModel):
    language: str
    questions: List[DiagnosticQuestion]
    total_questions: int


class AnswerSubmission(BaseModel):
    question_id: int
    level: str
    user_answer: str
    correct_answer: str
    is_correct: bool


class DiagnosticSubmission(BaseModel):
    language: str
    answers: List[AnswerSubmission]


class LevelBreakdown(BaseModel):
    correct: int
    total: int
    accuracy: float


class DiagnosticResult(BaseModel):
    estimated_level: str
    total_score: int
    max_score: int
    percentage: float
    level_breakdown: dict
    recommendations: List[str]


@router.get("/start", response_model=DiagnosticTestResponse)
async def start_diagnostic(
    language: str = Query(..., description="Target language to test (e.g., Spanish, Chinese, French)"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a diagnostic test to assess user's level in a language.

    Creates 15 questions spanning A1 to C1 difficulty:
    - 3 questions at A1 (basic vocabulary, simple phrases)
    - 3 questions at A2 (simple sentences, common expressions)
    - 3 questions at B1 (intermediate grammar, opinions)
    - 3 questions at B2 (complex structures, nuance)
    - 3 questions at C1 (advanced idioms, subtle meaning)

    Mix of question types:
    - Multiple choice
    - Fill in the blank
    - Short translation
    """
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        prompt = f"""Create a language placement test for {language} with exactly 15 questions.

Questions should span A1 to C1 difficulty:
- 3 questions at A1 level (basic vocabulary, simple phrases, greetings)
- 3 questions at A2 level (simple sentences, common expressions, daily activities)
- 3 questions at B1 level (intermediate grammar, expressing opinions, past/future tenses)
- 3 questions at B2 level (complex structures, nuance, hypotheticals)
- 3 questions at C1 level (advanced idioms, subtle meaning, formal register)

Mix question types:
- Multiple choice (4 options labeled A, B, C, D)
- Fill in the blank (provide the sentence with a blank)
- Translation (short phrases from English to {language})

Return valid JSON with this exact structure:
{{
  "questions": [
    {{
      "id": 1,
      "level": "A1",
      "type": "multiple_choice",
      "question": "What does 'hola' mean?",
      "options": ["A. Goodbye", "B. Hello", "C. Please", "D. Thank you"],
      "correct_answer": "B",
      "explanation": "'Hola' is the Spanish word for 'Hello'"
    }},
    {{
      "id": 2,
      "level": "A1",
      "type": "fill_blank",
      "question": "Complete: Me ___ Juan. (My name is Juan)",
      "options": null,
      "correct_answer": "llamo",
      "explanation": "'Me llamo' means 'My name is' in Spanish"
    }}
  ]
}}

Important:
- Questions should be in order from A1 to C1
- Each question must have a unique id from 1 to 15
- For multiple choice, correct_answer should be the letter (A, B, C, or D)
- For fill_blank and translation, correct_answer is the exact text
- Explanations should be helpful for learning
"""

        response = client.models.generate_content(
            model=GEMINI_MODELS["reasoning"],
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )

        result = json.loads(response.text)
        questions = [DiagnosticQuestion(**q) for q in result["questions"]]

        logger.info(f"Generated diagnostic test for {language} with {len(questions)} questions for user {current_user.id}")

        return DiagnosticTestResponse(
            language=language,
            questions=questions,
            total_questions=len(questions)
        )

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate test questions")
    except Exception as e:
        logger.error(f"Diagnostic test generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit", response_model=DiagnosticResult)
async def submit_diagnostic(
    submission: DiagnosticSubmission,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit diagnostic answers and calculate estimated level.

    Scoring logic:
    - Calculates accuracy for each CEFR level (A1-C1)
    - Estimated level is the highest level with >=60% accuracy
    - Provides personalized recommendations based on results
    """
    answers = submission.answers
    language = submission.language

    if not answers:
        raise HTTPException(status_code=400, detail="No answers provided")

    # Score by level
    level_scores = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0}
    level_totals = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0}

    for ans in answers:
        level = ans.level
        if level in level_totals:
            level_totals[level] += 1
            if ans.is_correct:
                level_scores[level] += 1

    # Determine estimated level (highest level with >=60% accuracy)
    estimated_level = "A1"
    level_order = ["A1", "A2", "B1", "B2", "C1"]

    for level in level_order:
        if level_totals[level] > 0:
            accuracy = level_scores[level] / level_totals[level]
            if accuracy >= 0.6:
                estimated_level = level

    total_score = sum(level_scores.values())
    max_score = sum(level_totals.values())
    percentage = (total_score / max_score * 100) if max_score > 0 else 0

    # Generate recommendations
    recommendations = generate_recommendations(estimated_level, level_scores, level_totals)

    # Update or create user profile
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()

    if not profile:
        profile = models.UserProfile(user_id=current_user.id)
        db.add(profile)

    profile.estimated_level = estimated_level
    profile.placement_score = total_score
    profile.placement_completed_at = datetime.utcnow()
    profile.placement_language = language

    db.commit()

    logger.info(f"User {current_user.id} completed diagnostic: level={estimated_level}, score={total_score}/{max_score}")

    # Build level breakdown
    level_breakdown = {}
    for level in level_order:
        if level_totals[level] > 0:
            level_breakdown[level] = {
                "correct": level_scores[level],
                "total": level_totals[level],
                "accuracy": round(level_scores[level] / level_totals[level] * 100, 1)
            }

    return DiagnosticResult(
        estimated_level=estimated_level,
        total_score=total_score,
        max_score=max_score,
        percentage=round(percentage, 1),
        level_breakdown=level_breakdown,
        recommendations=recommendations
    )


def generate_recommendations(
    estimated_level: str,
    level_scores: dict,
    level_totals: dict
) -> List[str]:
    """Generate personalized recommendations based on diagnostic results."""
    recommendations = []

    level_descriptions = {
        "A1": "basic vocabulary and simple phrases",
        "A2": "everyday expressions and simple conversations",
        "B1": "intermediate grammar and expressing opinions",
        "B2": "complex texts and nuanced expression",
        "C1": "advanced idioms and formal language"
    }

    # Main recommendation based on level
    if estimated_level == "A1":
        recommendations.append("Start with basic vocabulary building - aim for 10-15 new words daily")
        recommendations.append("Focus on common greetings and everyday phrases")
        recommendations.append("Use flashcards heavily to build your foundation")
    elif estimated_level == "A2":
        recommendations.append("Practice forming simple sentences about daily activities")
        recommendations.append("Start reading simple texts with picture books or graded readers")
        recommendations.append("Begin listening practice with slow, clear audio")
    elif estimated_level == "B1":
        recommendations.append("Focus on grammar patterns - past tenses and conditionals")
        recommendations.append("Start writing short paragraphs expressing opinions")
        recommendations.append("Watch content with subtitles in your target language")
    elif estimated_level == "B2":
        recommendations.append("Work on nuance and register - formal vs informal language")
        recommendations.append("Read authentic materials like news articles")
        recommendations.append("Practice complex grammar like subjunctive and hypotheticals")
    else:  # C1
        recommendations.append("Focus on idiomatic expressions and cultural nuances")
        recommendations.append("Read literature and academic texts")
        recommendations.append("Practice formal writing and presentations")

    # Identify weak areas
    level_order = ["A1", "A2", "B1", "B2", "C1"]
    for level in level_order:
        if level_totals.get(level, 0) > 0:
            accuracy = level_scores.get(level, 0) / level_totals[level]
            if accuracy < 0.5:
                recommendations.append(f"Review {level} content: {level_descriptions.get(level, level)}")

    return recommendations[:5]  # Limit to 5 recommendations


@router.get("/status")
async def get_diagnostic_status(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Check if user has completed a diagnostic test.

    Returns placement results if available.
    """
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()

    if not profile or not profile.placement_completed_at:
        return {
            "completed": False,
            "estimated_level": None,
            "placement_language": None,
            "completed_at": None
        }

    return {
        "completed": True,
        "estimated_level": profile.estimated_level,
        "placement_language": profile.placement_language,
        "placement_score": profile.placement_score,
        "completed_at": profile.placement_completed_at.isoformat()
    }


@router.post("/reset")
async def reset_diagnostic(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reset diagnostic results to allow retaking the test.
    """
    profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()

    if profile:
        profile.estimated_level = None
        profile.placement_score = None
        profile.placement_completed_at = None
        profile.placement_language = None
        db.commit()

    return {"ok": True, "message": "Diagnostic results reset"}
