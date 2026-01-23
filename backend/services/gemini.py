import os
import json
import base64
from io import BytesIO
from dotenv import load_dotenv

from google import genai
from google.genai import types
from gtts import gTTS

load_dotenv()

# Configure the SDK
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Model constant
MODEL_ID = "gemini-2.0-flash-exp"


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
        - vocabulary: A list of objects like {{"term": "...", "pos": "...", "translation": "...", "pinyin": "..."}}
        - difficulty_level: A1, A2, B1, B2, C1, or C2.
        - usage_examples: Array of 2-3 example sentences showing usage. Each object: {{"example": "sentence in {target_language}", "translation": "English translation"}}
        - memory_aid: A mnemonic, character breakdown, or helpful tip to remember this word (only for single words)
        - related_words: Array of 3-5 related or similar terms that would be useful to learn{context_note}
        """

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        try:
            result = json.loads(response.text)
            # Add context_sentence to the response if it was provided
            if context_sentence and context_sentence != text:
                result['context_sentence'] = context_sentence
            return result
        except Exception:
            return response.text

    @staticmethod
    async def analyze_text_stream(text: str, target_language: str):
        prompt = f"Explain the grammar and usage of '{text}' in {target_language}. Be thorough."
        response = client.models.generate_content_stream(
            model=MODEL_ID, contents=prompt
        )
        for chunk in response:
            if getattr(chunk, "text", None):
                yield f"data: {chunk.text}\n\n"

    @staticmethod
    def generate_practice_quiz(words: list, target_language: str):
        prompt = f"Create a 5-question quiz for a student learning {target_language}. Focus on these words: {', '.join(words)}. Return JSON array of objects {'{question, options, answer, explanation}'}"
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
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

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                prompt_text,
                types.Part.from_bytes(data=audio_content, mime_type="audio/mp3"),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "transcription": {"type": "STRING"},
                        "reply": {"type": "STRING"},
                        "feedback": {"type": "STRING"},
                    },
                },
            ),
        )

        try:
            return json.loads(response.text)
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
        persona = f"You are a {tutor_style} {target_language} tutor."
        if topic:
            persona += f" Topic: {topic}."

        prompt = f"{persona} {scenario}\nUser says: {user_text}\nReturn ONLY JSON with keys: reply, feedback"

        chat = client.chats.create(model=MODEL_ID, history=history)
        response = chat.send_message(
            message=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        try:
            return json.loads(response.text)
        except Exception:
            return response.text
