import os
import json
import base64
from io import BytesIO
from dotenv import load_dotenv
import logging

from google import genai
from google.genai import types
from gtts import gTTS

import schemas

from config.gemini_models import GEMINI_MODELS

logger = logging.getLogger("gemini_service")
load_dotenv()

# Configure the SDK
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


class GeminiService:
    @staticmethod
    def analyze_text(text: str, target_language: str, context_sentence: str = None):
        """
        Analyze text with optional context sentence for deeper understanding.

        Args:
            text: The word or sentence to analyze
            target_language: The language being studied
            context_sentence: Optional sentence containing the word for context
        """
        context_note = ""
        if context_sentence and context_sentence != text:
            context_note = f'\n- context_sentence: The original sentence where this word was found: "{context_sentence}"'

        prompt = f"""
        Analyze the {target_language} text: "{text}"
        {f'Context: This word/phrase appears in the sentence: "{context_sentence}"' if context_sentence and context_sentence != text else ''}

        Return ONLY JSON with these keys:
        - translation: Natural English translation.
        - literal_translation: Word-for-word translation.
        - grammar_breakdown: Detailed explanation of grammar used.
        - vocabulary: A list of objects. Each object MUST have: {{"term": "...", "pos": "...", "translation": "...", "pinyin": "..."}}
          IMPORTANT: For Chinese text, ALWAYS include pinyin romanization (e.g., "nǐ hǎo" for "你好").
          For Japanese, include romaji. For other languages, include pronunciation guide if helpful, or use empty string.
        - difficulty_level: A1, A2, B1, B2, C1, or C2.
        - usage_examples: Array of 2-3 example sentences showing usage. Each object: {{"example": "sentence in {target_language}", "translation": "English translation"}}
        - memory_aid: A mnemonic, character breakdown, or helpful tip to remember this word (only for single words)
        - related_words: Array of 3-5 related or similar terms that would be useful to learn{context_note}
        """

        try:
            response = client.models.generate_content(
                model=GEMINI_MODELS["default"],
                contents=prompt,
                config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schemas.AnalysisResponse 
                    ),
            )
            if response.parsed:
                result = response.parsed.model_dump()
                if context_sentence:
                    result['context_sentence'] = context_sentence
                return result
            
            return None

        except Exception as e:
            logger.error(f"Gemini Analysis Error: {e}", exc_info=True)
            # You might want to re-raise or return a fallback here
            raise e

    @staticmethod
    async def analyze_text_stream(text: str, target_language: str):
        prompt = f"Explain the grammar and usage of '{text}' in {target_language}. Be thorough."
        response = client.models.generate_content_stream(
            model=GEMINI_MODELS["default"], contents=prompt
        )
        for chunk in response:
            if getattr(chunk, "text", None):
                yield f"data: {chunk.text}\n\n"

    @staticmethod
    def generate_practice_quiz(words: list, target_language: str):
        prompt = f"Create a 5-question quiz for a student learning {target_language}. Focus on these words: {', '.join(words)}. Return JSON array of objects {'{question, options, answer, explanation}'}"
        response = client.models.generate_content(
            model=GEMINI_MODELS["default"],
            contents=prompt,
            config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schemas.QuizResponse
                ),
        )
        try:
            return json.loads(response.text)
        except Exception:
            return response.text

    @staticmethod
    def process_audio_tutor(
        audio_file_path: str,
        target_language: str,
        conversation_history: list,
        tutor_style: str = "Friendly",
        topic: str | None = None,
        voice: str | None = None,
    ):
        """Accepts an audio file and returns a dict with transcription, reply and feedback."""
        with open(audio_file_path, "rb") as f:
            audio_content = f.read()

        history_context = "\n".join(
            [f"{m.get('role')}: {m.get('content')}" for m in conversation_history]
        )

        persona = f"You are a {tutor_style} {target_language} tutor."
        if topic:
            persona += f" Topic: {topic}."
        if voice:
            persona += f" Use voice hint: {voice}."

        prompt_text = (
            f"{persona} Listen to the user's audio. In your response:\n"
            f"1. Transcribe what they said.\n"
            f"2. Provide detailed feedback on pronunciation, tone, and accent, giving phonetic hints where useful.\n"
            f"3. Correct any grammar mistakes and provide a brief explanation in English.\n"
            f"4. Reply in {target_language} to continue the conversation.\n"
            f"Return ONLY JSON with keys: transcription, reply, feedback.\n"
            f"Previous context: {history_context}"
        )
        try:
            response = client.models.generate_content(
                model=GEMINI_MODELS["audio"],
                contents=[
                    prompt_text,
                    types.Part.from_bytes(data=audio_content, mime_type="audio/mp3"),
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schemas.AudioTutorResponse,
                ),
            )
            return response.parsed.model_dump() if response.parsed else {}

        except Exception:
            return {"transcription": None, "reply": response.text, "feedback": None}

    @staticmethod
    def text_to_speech(
        text: str, language: str = "en", voice: str | None = None
    ) -> str:
        """Generate MP3 audio and return base64 string. Uses gTTS as a fallback implementation."""
        try:
            tts_lang = language.split("-")[0].lower() if language else "en"
            buf = BytesIO()
            tts = gTTS(text=text, lang=tts_lang)
            tts.write_to_fp(buf)
            buf.seek(0)
            return base64.b64encode(buf.read()).decode("utf-8")
        except Exception:
            return ""

    @staticmethod
    def get_chat_response(
        user_text: str,
        target_language: str,
        scenario: str,
        history: list = [],
        tutor_style: str = "Friendly",
        topic: str | None = None,
    ):
        prompt = f"""
        Role: {tutor_style} {target_language} Tutor. 
        Topic: {topic or scenario}.
        User says: "{user_text}"
        
        Provide a reply in {target_language} and feedback in English.
        """

        try:
            chat = client.chats.create(model=GEMINI_MODELS["default"], history=history)
            
            response = chat.send_message(
                message=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schemas.ChatResponse 
                ),
            )
            return response.parsed.model_dump() if response.parsed else {}
        except Exception as e:
            logger.error(f"Chat Error: {e}")
            return {"reply": "Error", "feedback": str(e)}

    @staticmethod
    async def analyze_long_content(
        text: str,
        target_language: str,
        native_language: str = "English"
    ) -> dict:
        """
        Use Gemini's extended context window to analyze entire articles/books.
        Refactored to use Native Structured Output.
        """
        
        prompt = f"""
        Perform a COMPREHENSIVE analysis of this entire {target_language} text.
        
        Text Length: {len(text)} characters.
        
        Tasks:
        1. **SUMMARY**: Main themes, tone, purpose.
        2. **VOCABULARY**: Extract the 50 most valuable words ranked by usefulness (A1-C2).
        3. **GRAMMAR**: Identify 15 distinct grammar structures used.
        4. **CULTURE**: Explain cultural references and idioms.
        5. **DIFFICULTY**: Map progression (beginning/middle/end).
        6. **DISCUSSION**: 10 questions for comprehension/analysis.
        7. **RELATED**: Suggestions for similar texts/authors.

        Use the ENTIRE text context to provide deep insights.
        """

        try:
            response = client.models.generate_content(
                model=GEMINI_MODELS["reasoning"], 
                contents=[prompt, text],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schemas.LongContentAnalysisResponse # <--- The Schema
                ),
            )

            if response.parsed:
                return response.parsed.model_dump()
            else:
                return {
                    "error": "Model returned empty response", 
                    "raw_response": str(response)
                }

        except Exception as e:
            logger.error(f"Long Content Analysis Error: {e}", exc_info=True)
            return {
                "error": f"Analysis failed: {str(e)}",
                "type": "RuntimeError"
            }