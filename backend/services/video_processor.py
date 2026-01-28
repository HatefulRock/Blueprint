"""
Gemini 3 multimodal video analysis service.

This module provides video processing capabilities using Gemini 3's vision model to:
- Extract and transcribe audio from videos
- Generate timestamped subtitles
- Identify vocabulary and grammar patterns
- Create interactive exercises from video content
- Assess difficulty level

Showcases Gemini 3's multimodal capabilities with video + audio + text analysis.
"""

import os
import json
from typing import Dict, List, Optional
from google import genai
from google.genai import types
from config.gemini_models import GEMINI_MODELS


class VideoProcessor:
    """Process videos using Gemini 3 multimodal vision capabilities."""

    def __init__(self):
        """Initialize the video processor with Gemini client."""
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    async def analyze_video(
        self,
        video_path: str,
        target_language: str,
        native_language: str = "English",
        generate_subtitles: bool = True,
        extract_vocabulary: bool = True,
    ) -> Dict:
        """
        Use Gemini 3 Vision to analyze video content comprehensively.

        Args:
            video_path: Path to the video file
            target_language: Language being studied in the video
            native_language: User's native language for translations
            generate_subtitles: Whether to generate timestamped subtitles
            extract_vocabulary: Whether to extract vocabulary from video

        Returns:
            Dictionary containing:
            - transcript: Full video transcript with timestamps
            - subtitles: Timestamped subtitle segments
            - vocabulary: List of words with context and translations
            - grammar_points: Identified grammar patterns
            - difficulty_level: CEFR level (A1-C2)
            - cultural_notes: Cultural context and idioms
        """
        # Upload video to Gemini
        with open(video_path, "rb") as video_file:
            video_part = types.Part.from_bytes(
                data=video_file.read(), mime_type="video/mp4"
            )

        # Gemini 3 multimodal analysis prompt
        prompt = f"""Analyze this {target_language} video comprehensively:

1. TRANSCRIPTION: Generate accurate subtitles with timestamps (format: MM:SS)
2. VOCABULARY: Extract 20-30 key words/phrases worth learning
3. GRAMMAR: Identify 5-10 grammar patterns demonstrated in the video
4. DIFFICULTY: Estimate CEFR level (A1, A2, B1, B2, C1, or C2)
5. CULTURAL CONTEXT: Note any cultural references, idioms, or regional expressions

Target language: {target_language}
Native language: {native_language}

Return ONLY JSON with this exact structure:
{{
  "transcript": [
    {{
      "start_time": "00:00",
      "end_time": "00:03",
      "text": "...",
      "speaker": "Speaker 1"
    }}
  ],
  "vocabulary": [
    {{
      "word": "...",
      "translation": "...",
      "context": "sentence where word appears",
      "timestamp": "00:12",
      "part_of_speech": "noun/verb/adjective/etc",
      "difficulty": "A1-C2"
    }}
  ],
  "grammar_points": [
    {{
      "pattern": "Grammar pattern name",
      "explanation": "Clear explanation of the grammar rule",
      "examples": ["example1", "example2"],
      "difficulty": "A1-C2"
    }}
  ],
  "difficulty_level": "B1",
  "cultural_notes": "Cultural context, idioms, and regional expressions explained"
}}
"""

        response = self.client.models.generate_content(
            model=GEMINI_MODELS["vision"],  # Use Gemini 3 vision for multimodal analysis
            contents=[prompt, video_part],
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )

        try:
            result = json.loads(response.text)
            return result
        except json.JSONDecodeError as e:
            # Fallback if JSON parsing fails
            return {
                "transcript": [],
                "vocabulary": [],
                "grammar_points": [],
                "difficulty_level": "Unknown",
                "cultural_notes": f"Analysis failed: {str(e)}",
                "raw_response": response.text,
            }

    async def generate_exercises_from_video(
        self,
        transcript: List[Dict],
        vocabulary: List[Dict],
        grammar_points: List[Dict],
        target_language: str,
    ) -> Dict:
        """
        Use Gemini 3 Pro for sophisticated exercise generation from video content.

        Leverages improved reasoning for educational content creation.

        Args:
            transcript: Timestamped transcript from video
            vocabulary: Vocabulary extracted from video
            grammar_points: Grammar patterns identified in video
            target_language: Language being studied

        Returns:
            Dictionary containing various exercise types:
            - comprehension: Questions about video content
            - vocabulary: Fill-in-blank exercises using video vocabulary
            - grammar: Exercises practicing identified patterns
            - speaking: Pronunciation challenges from video
            - writing: Prompts related to video topic
        """
        prompt = f"""Based on this video content, create comprehensive interactive exercises for a {target_language} learner.

VIDEO CONTENT:
Transcript (first 5 segments): {json.dumps(transcript[:5])}
Vocabulary ({len(vocabulary)} words): {json.dumps(vocabulary[:10])}
Grammar Patterns: {json.dumps(grammar_points)}

Generate the following exercise types:

1. COMPREHENSION (5 multiple-choice questions):
   - Test understanding of video content
   - 4 options each, only 1 correct
   - Include explanation for correct answer

2. VOCABULARY (10 fill-in-blank exercises):
   - Use vocabulary from the video
   - Provide context sentences from or related to video
   - Include hints

3. GRAMMAR (5 exercises):
   - Practice the identified grammar patterns
   - Mix of fill-in-blank and transformation exercises
   - Detailed explanations

4. SPEAKING (3 pronunciation challenges):
   - Key phrases from the video to practice
   - Include phonetic guidance
   - Link to specific timestamps in video

5. WRITING (2 prompts):
   - Creative prompts related to video topic
   - Encourage use of learned vocabulary and grammar
   - Appropriate length for learner level

Return ONLY JSON with this structure:
{{
  "comprehension": [
    {{
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "...",
      "timestamp": "01:23"
    }}
  ],
  "vocabulary": [
    {{
      "sentence": "Sentence with _____ blank",
      "correct_answer": "word",
      "hint": "...",
      "translation": "..."
    }}
  ],
  "grammar": [
    {{
      "type": "fill_blank" | "transformation",
      "question": "...",
      "correct_answer": "...",
      "grammar_point": "pattern name",
      "explanation": "..."
    }}
  ],
  "speaking": [
    {{
      "phrase": "...",
      "phonetic": "...",
      "translation": "...",
      "timestamp": "01:23",
      "tip": "..."
    }}
  ],
  "writing": [
    {{
      "prompt": "...",
      "suggested_vocabulary": ["word1", "word2"],
      "suggested_grammar": ["pattern1"],
      "min_words": 50
    }}
  ]
}}
"""

        response = self.client.models.generate_content(
            model=GEMINI_MODELS["reasoning"],  # Use Gemini 3 Pro for better reasoning
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            # Return empty exercises if parsing fails
            return {
                "comprehension": [],
                "vocabulary": [],
                "grammar": [],
                "speaking": [],
                "writing": [],
            }

    async def extract_audio_transcript(
        self, video_path: str, target_language: str
    ) -> Dict:
        """
        Extract just the audio transcript from a video.

        Simpler, faster alternative to full video analysis when only
        transcription is needed.

        Args:
            video_path: Path to video file
            target_language: Language in the video

        Returns:
            Dictionary with transcript and basic metadata
        """
        with open(video_path, "rb") as video_file:
            video_part = types.Part.from_bytes(
                data=video_file.read(), mime_type="video/mp4"
            )

        prompt = f"""Transcribe the audio from this video in {target_language}.

Provide accurate timestamps (format: MM:SS) for each segment.
Identify different speakers if there are multiple people.

Return JSON with:
{{
  "transcript": [
    {{
      "start_time": "00:00",
      "end_time": "00:03",
      "text": "...",
      "speaker": "Speaker 1"
    }}
  ],
  "language_detected": "{target_language}",
  "total_duration": "MM:SS"
}}
"""

        response = self.client.models.generate_content(
            model=GEMINI_MODELS["audio"],  # Use audio model for transcription
            contents=[prompt, video_part],
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            return {
                "transcript": [],
                "language_detected": target_language,
                "total_duration": "00:00",
            }
