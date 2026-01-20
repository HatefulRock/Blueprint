import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Configure the SDK
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Define your model name as a string constant
# Note: Ensure 'gemini-2.0-flash-exp' or specific version exists.
# 'gemini-3' is likely a typo unless you have private access.
MODEL_ID = "gemini-2.0-flash-exp"


class GeminiService:
    @staticmethod
    def analyze_text(text: str, target_language: str):
        prompt = f"""
        Analyze the {target_language} text: "{text}"
        Return ONLY JSON with these keys:
        - translation: Natural English translation.
        - literal_translation: Word-for-word translation.
        - grammar_breakdown: Detailed explanation of grammar used.
        - vocabulary: A list of objects like {{"term": "...", "pos": "...", "translation": "..."}}
          containing the most important words in the text.
        - difficulty_level: A1, A2, B1, B2, C1, or C2.
        """

        # UPDATED: Call generate_content on the client.models accessor
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
    async def analyze_text_stream(text: str, target_language: str):
        """Streams a detailed linguistic breakdown."""
        prompt = f"Explain the grammar and usage of '{text}' in {target_language}. Be thorough."

        # UPDATED: Use generate_content_stream
        response = client.models.generate_content_stream(
            model=MODEL_ID, contents=prompt
        )

        for chunk in response:
            if chunk.text:
                yield f"data: {chunk.text}\n\n"

    @staticmethod
    def generate_practice_quiz(words: list, target_language: str):
        prompt = f"""
        Create a 5-question quiz for a student learning {target_language}.
        Focus on these words: {", ".join(words)}.
        Return JSON format: [{{ "question": "", "options": ["", ""], "answer": "", "explanation": "" }}]
        """

        # UPDATED: Syntax
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
        audio_file_path: str, target_language: str, conversation_history: list
    ):
        """
        Accepts an audio file and returns critique + response.
        """
        # UPDATED: File upload syntax for new SDK
        with open(audio_file_path, "rb") as f:
            audio_content = f.read()

        # Context for the AI Tutor
        history_context = "\n".join(
            [f"{m['role']}: {m['content']}" for m in conversation_history]
        )

        prompt_text = (
            f"You are a friendly {target_language} language tutor. "
            f"Listen to the user's audio. In your response:\n"
            f"1. Transcribe what they said.\n"
            f"2. Correct any pronunciation or grammar mistakes.\n"
            f"3. Respond in {target_language} to keep the conversation going.\n"
            f"Previous context: {history_context}"
        )

        # UPDATED: Pass content as a list of parts (Text + Audio Bytes)
        # Note: You can also use client.files.upload, but sending bytes directly
        # is often easier for short audio clips in the new SDK.
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

        return response.text

    @staticmethod
    def get_chat_response(
        user_text: str, target_language: str, scenario: str, history: list = []
    ):
        # UPDATED: Chat syntax
        chat = client.chats.create(model=MODEL_ID, history=history)

        prompt = f"{scenario}\nUser says: {user_text}"

        response = chat.send_message(
            message=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return response.text
