import json
from typing import List
from .gemini import GeminiService


class PracticeGenerator:
    @staticmethod
    async def generate_quiz_from_words(words_list: List[dict], target_language: str):
        """
        Takes a list of word dictionaries and generates a structured quiz.
        words_list: [{"term": "...", "translation": "...", "context": "..."}]
        """

        # We prepare the data to send to Gemini to keep the prompt tokens low
        simplified_words = [
            {
                "term": w["term"],
                "translation": w["translation"],
                "context": w.get("context", ""),
            }
            for w in words_list
        ]

        prompt = f"""
        You are an expert {target_language} teacher.
        Create a language quiz based on these specific words the student is struggling with:
        {json.dumps(simplified_words)}

        For each word, create a question. Vary the types between:
        1. 'cloze': A fill-in-the-blank sentence (use the provided context if possible).
        2. 'multiple_choice': Find the correct translation or meaning.

        Return a JSON array of objects:
        [
          {{
            "word": "the target word",
            "type": "cloze" | "multiple_choice",
            "question": "The question text. If cloze, use ____ for the blank.",
            "choices": ["option A", "option B", "option C", "option D"], (Include this ONLY for multiple_choice)
            "answer": "the correct string",
            "explanation": "A brief explanation of why this is correct in the context."
          }}
        ]

        Rules:
        - Choices for multiple choice must be in the same language as the answer.
        - If 'cloze', the sentence should be natural and helpful.
        - Return ONLY JSON.
        """

        try:
            # Use GeminiService to generate a quiz. GeminiService.generate_practice_quiz
            # returns parsed JSON (or None on failure).
            response = GeminiService.generate_practice_quiz(
                [w["term"] for w in simplified_words], target_language
            )
            return response
        except Exception as e:
            print(f"Error generating quiz: {e}")
            return None

    @staticmethod
    def select_weak_words(db_words, limit=5):
        """
        Logic to pick which words to practice.
        Filters by familiarity_score (lowest first) and next_review_date.
        """
        # Sort by familiarity score ascending (weakest first)
        sorted_words = sorted(db_words, key=lambda x: x.familiarity_score)
        return sorted_words[:limit]
