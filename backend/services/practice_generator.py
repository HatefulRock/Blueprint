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

        try:
            response = GeminiService.generate_practice_quiz(
                simplified_words, target_language
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
