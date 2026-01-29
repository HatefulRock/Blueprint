# Blueprint - System Architecture Documentation

## Overview

Blueprint is a multimodal AI-powered language learning platform that leverages Google's Gemini 3 models to provide contextual analysis of text, audio, and video content. The application transforms any content into an interactive learning experience with instant vocabulary analysis, grammar breakdowns, and personalized exercises.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + TypeScript)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  ReaderView     │  │ VideoLearning   │  │ FlashcardView   │    │
│  │  - Import text  │  │ - Upload video  │  │ - SRS review    │    │
│  │  - Click words  │  │ - Subtitles     │  │ - Track progress│    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │
│           │                    │                     │              │
│           └────────────────────┼─────────────────────┘              │
│                                │                                     │
│                    ┌───────────▼───────────┐                        │
│                    │   AppContext (State)   │                        │
│                    │   - User session       │                        │
│                    │   - Current content    │                        │
│                    │   - Target language    │                        │
│                    └───────────┬───────────┘                        │
│                                │                                     │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │ HTTP/REST
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                      BACKEND (FastAPI + Python)                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────── API ROUTERS ───────────────────┐                 │
│  │ /words │ /content │ /ai │ /video │ /practice  │                 │
│  └───────┬──────────────────────────────────┬─────┘                 │
│          │                                   │                       │
│          ▼                                   ▼                       │
│  ┌──────────────────────┐         ┌───────────────────────┐        │
│  │   Auth Service       │         │   Database Layer      │        │
│  │   - JWT tokens       │◄────────┤   (SQLAlchemy ORM)    │        │
│  │   - User validation  │         │   - User              │        │
│  └──────────────────────┘         │   - Deck              │        │
│                                    │   - Word              │        │
│  ┌──────────────────────────────┐ │   - Card              │        │
│  │     SERVICE LAYER            │ │   - ReadingContent    │        │
│  ├──────────────────────────────┤ │   - PracticeSession   │        │
│  │                              │ └───────────────────────┘        │
│  │  ┌────────────────────────┐ │                                   │
│  │  │  GeminiService         │ │         SQLite Database           │
│  │  ├────────────────────────┤ │                                   │
│  │  │ • analyze_text()       │ │                                   │
│  │  │ • analyze_long_content│ │                                   │
│  │  │ • process_audio_tutor  │ │                                   │
│  │  │ • get_chat_response()  │ │                                   │
│  │  │ • generate_quiz()      │ │                                   │
│  │  └────────┬───────────────┘ │                                   │
│  │           │                  │                                   │
│  │  ┌────────▼───────────────┐ │                                   │
│  │  │  VideoProcessor        │ │                                   │
│  │  ├────────────────────────┤ │                                   │
│  │  │ • analyze_video()      │ │                                   │
│  │  │ • extract_transcript() │ │                                   │
│  │  │ • generate_exercises() │ │                                   │
│  │  └────────┬───────────────┘ │                                   │
│  │           │                  │                                   │
│  │  ┌────────▼───────────────┐ │                                   │
│  │  │  CardService           │ │                                   │
│  │  ├────────────────────────┤ │                                   │
│  │  │ • create_card()        │ │                                   │
│  │  │ • bulk_create_cards()  │ │                                   │
│  │  │ • render_templates()   │ │                                   │
│  │  └────────────────────────┘ │                                   │
│  └──────────────────────────────┘                                   │
│                     │                                                │
│                     │ API Calls                                      │
└─────────────────────┼──────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   GOOGLE GEMINI 3 API                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  gemini-3-flash │  │  gemini-3-pro   │  │  gemini-3-audio │    │
│  │  - Text analysis│  │  - Long content │  │  - Transcription│    │
│  │  - Chat replies │  │  - Reasoning    │  │  - Voice feedback│   │
│  │  - Fast tasks   │  │  - Exercises    │  │                 │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────┐           │
│  │           gemini-3-vision (multimodal)               │           │
│  │           - Video analysis                            │           │
│  │           - Subtitle extraction                       │           │
│  │           - Visual + audio comprehension             │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                       │
│  KEY FEATURES USED:                                                  │
│  ✅ Native Structured Output (response_schema with Pydantic)        │
│  ✅ Extended Context Window (2M tokens for long content)            │
│  ✅ Multimodal Input (video, audio, images)                         │
│  ✅ Live Chat API (stateful conversations)                          │
│  ✅ JSON Mode (guaranteed structured responses)                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### 1. Word Analysis Flow

```
User clicks word "estudiante" in article
    ↓
Frontend → POST /ai/analyze
    {
      text: "estudiante",
      target_language: "Spanish",
      context_sentence: "El estudiante lee un libro"
    }
    ↓
Backend GeminiService.analyze_text()
    ↓
Gemini 3 API (with response_schema=AnalysisResponse)
    ↓
Returns structured JSON:
    {
      translation: "student",
      literal_translation: "the studying one",
      grammar_breakdown: "Noun derived from verb 'estudiar'...",
      vocabulary: [{term: "estudiar", pos: "verb", translation: "to study"}],
      difficulty_level: "A2",
      usage_examples: [...],
      memory_aid: "Remember: estudiar (study) + -ante (one who does)",
      related_words: ["estudiar", "estudio", "estudiosa"]
    }
    ↓
Backend saves to Word table (optional)
    ↓
Frontend displays AnalysisPopup
```

### 2. Video Analysis Flow

```
User uploads video.mp4
    ↓
Frontend → POST /video/upload
    FormData: {file, target_language, native_language}
    ↓
Backend VideoProcessor.analyze_video()
    ↓
Video encoded as types.Part.from_bytes(mime_type="video/mp4")
    ↓
Gemini 3 Vision API
    Analyzes: audio + visual + text in video
    ↓
Returns:
    {
      transcript: [{start_time, end_time, text, speaker}],
      vocabulary: [{word, translation, context, timestamp}],
      grammar_points: [{pattern, explanation, examples}],
      difficulty_level: "B1",
      cultural_notes: "..."
    }
    ↓
Backend → VideoProcessor.generate_exercises_from_video()
    Uses Gemini 3 Pro for reasoning
    ↓
Returns exercises: {comprehension, vocabulary, grammar, speaking, writing}
    ↓
Frontend displays:
    - Video player with synchronized subtitles
    - Clickable vocabulary with timestamps
    - Grammar patterns
    - Interactive exercises
```

### 3. Long Content Analysis Flow

```
User imports 10,000-word article
    ↓
Frontend → POST /content/create
    ↓
Backend GeminiService.analyze_long_content()
    ↓
Gemini 3 Pro with Extended Context Window
    Prompt: "Analyze this ENTIRE text... extract top 50 vocabulary..."
    ↓
Returns LongContentAnalysisResponse:
    {
      text_stats: {total_characters, total_words, reading_time},
      summary: {main_theme, key_points, tone, audience},
      vocabulary: [50 most useful words ranked by usefulness],
      grammar_patterns: [15 patterns with examples],
      cultural_context: {idioms, references, regional_features},
      difficulty_progression: {beginning, middle, end},
      discussion_questions: [10 comprehension questions],
      related_content: {similar_texts, topics, authors}
    }
    ↓
Backend saves to ReadingContent table
    ↓
Frontend displays comprehensive analysis
    User can click any word for deeper analysis (repeat flow #1)
```

---

## Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.2
- **State Management**: Context API
- **HTTP Client**: Axios 1.13
- **Styling**: Tailwind CSS (utility-first)
- **Testing**: Vitest + React Testing Library

### Backend
- **Framework**: FastAPI (async Python web framework)
- **ORM**: SQLAlchemy with SQLite database
- **Validation**: Pydantic v2 (also used for Gemini schemas)
- **Authentication**: JWT tokens with argon2 password hashing
- **API Client**: Google GenAI SDK (@google/genai 1.29.1)
- **Audio Processing**: gTTS (Google Text-to-Speech)

### AI/ML
- **Primary Model**: Gemini 3 Flash Preview (default, audio, vision)
- **Reasoning Model**: Gemini 3 Pro (complex analysis, exercise generation)
- **Key Features**: Native Structured Output, Extended Context, Multimodal

### Database Schema

```
User
├─ id (UUID, PK)
├─ username (unique)
├─ password_hash
├─ points, streak
└─ (1:N) → Deck

Deck
├─ id (UUID, PK)
├─ user_id (FK)
├─ name, language
└─ (1:N) → Word, Card

Word
├─ id (UUID, PK)
├─ deck_id (FK)
├─ term, translation
├─ context, part_of_speech
├─ grammatical_breakdown
├─ familiarity_score
└─ (1:N) → Card, WordContext

Card
├─ id (UUID, PK)
├─ deck_id (FK)
├─ word_id (FK)
├─ front, back (rendered from template)
├─ next_review_date
├─ repetition, easiness_factor, interval (SM-2 algorithm)
└─ template_id (FK) → CardTemplate

ReadingContent
├─ id (UUID, PK)
├─ user_id (FK)
├─ title, content, source_url
├─ difficulty_score
└─ created_at

PracticeSession
├─ id (UUID, PK)
├─ user_id (FK)
├─ deck_id (FK)
└─ session_date, duration_minutes
```

---

## Gemini 3 Integration Details

### 1. Native Structured Output (PRIMARY FEATURE)

**Implementation**: All Gemini API calls use `response_schema` with Pydantic models.

**Code Example** (`backend/services/gemini.py:56-63`):
```python
response = client.models.generate_content(
    model=GEMINI_MODELS["default"],
    contents=prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schemas.AnalysisResponse  # Pydantic model
    ),
)
if response.parsed:
    result = response.parsed.model_dump()
```

**Schemas Used**:
- `AnalysisResponse`: Word/sentence analysis
- `LongContentAnalysisResponse`: Comprehensive content analysis
- `AudioTutorResponse`: Voice feedback
- `ChatResponse`: Conversation replies
- `QuizResponse`: Quiz generation

**Benefits**:
- Zero parsing errors
- Guaranteed field consistency
- Type safety throughout the stack
- No regex or manual JSON parsing needed

### 2. Extended Context Window (PRIMARY FEATURE)

**Implementation**: `analyze_long_content()` method processes entire documents.

**Code Example** (`backend/services/gemini.py:199-250`):
```python
async def analyze_long_content(text: str, target_language: str) -> dict:
    prompt = f"""
    Perform a COMPREHENSIVE analysis of this entire {target_language} text.
    Text Length: {len(text)} characters.

    Tasks:
    1. SUMMARY: Main themes, tone, purpose
    2. VOCABULARY: Extract the 50 most valuable words...
    3. GRAMMAR: Identify 15 distinct structures...
    """

    response = client.models.generate_content(
        model=GEMINI_MODELS["reasoning"],  # Gemini 3 Pro
        contents=[prompt, text],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schemas.LongContentAnalysisResponse
        ),
    )
```

**Use Cases**:
- Book chapter analysis (10,000+ words)
- Academic paper comprehension
- Novel study guides
- Long-form article breakdowns

**Benefits**:
- Understand full context for better vocabulary ranking
- Identify progression of difficulty through the text
- Generate comprehensive discussion questions
- Cultural context from entire work

### 3. Multimodal (Vision + Audio) (PRIMARY FEATURE)

**Implementation**: Video files sent as binary data to Gemini 3 Vision.

**Code Example** (`backend/services/video_processor.py:56-61`):
```python
with open(video_path, "rb") as video_file:
    video_part = types.Part.from_bytes(
        data=video_file.read(),
        mime_type="video/mp4"
    )

response = self.client.models.generate_content(
    model=GEMINI_MODELS["vision"],  # gemini-3-flash-preview
    contents=[prompt, video_part],
    config=types.GenerateContentConfig(
        response_mime_type="application/json"
    ),
)
```

**Analysis Output**:
- Timestamped transcript (MM:SS format)
- Vocabulary with context and timestamps
- Grammar patterns demonstrated in video
- CEFR difficulty level
- Cultural notes and idioms
- Auto-generated exercises

**Benefits**:
- Learn from real-world videos (news, movies, vlogs)
- See word usage in natural conversation
- Pronunciation practice with authentic audio
- Visual context aids comprehension

### 4. Live Chat API (SUPPORTING FEATURE)

**Implementation**: Stateful conversation with history.

**Code Example** (`backend/services/gemini.py:185-197`):
```python
chat = client.chats.create(
    model=GEMINI_MODELS["default"],
    history=history
)

response = chat.send_message(
    message=prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schemas.ChatResponse
    ),
)
```

**Use Cases**:
- Conversation practice scenarios (restaurant, airport, shopping)
- Grammar correction with explanations
- Vocabulary reinforcement in dialogue

### 5. Audio Processing (SUPPORTING FEATURE)

**Implementation**: Audio file transcription with feedback.

**Code Example** (`backend/services/gemini.py:136-147`):
```python
with open(audio_file_path, "rb") as f:
    audio_content = f.read()

response = client.models.generate_content(
    model=GEMINI_MODELS["audio"],
    contents=[
        prompt_text,
        types.Part.from_bytes(data=audio_content, mime_type="audio/mp3")
    ],
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schemas.AudioTutorResponse
    ),
)
```

**Returns**:
- Transcription of user's speech
- Pronunciation feedback with phonetic hints
- Grammar corrections
- Natural reply in target language

---

## Model Selection Strategy

```python
# backend/config/gemini_models.py

GEMINI_MODELS = {
    "default": "gemini-3-flash-preview",      # Fast, general-purpose
    "reasoning": "gemini-3-flash-preview",    # Complex analysis
    "audio": "gemini-3-flash-preview",        # Audio transcription
    "vision": "gemini-3-flash-preview",       # Video/image analysis
    "tts": "gemini-3-flash-preview",          # Text-to-speech
    "live": "gemini-3-flash-preview",         # Real-time chat
}
```

**Selection Criteria**:
- **Flash**: Fast response for real-time features (word lookup, chat)
- **Pro**: Better reasoning for complex tasks (long content, exercise generation)
- **Vision**: Multimodal analysis (video + audio + text)
- **Audio**: Speech transcription and pronunciation feedback

---

## Security & Performance

### Security Measures
1. **Authentication**: JWT tokens with secure argon2 password hashing
2. **File Upload Limits**: 50MB for videos, 10MB for PDFs
3. **Content Type Validation**: Whitelist of allowed MIME types
4. **SQL Injection Prevention**: SQLAlchemy ORM (no raw queries)
5. **CORS Configuration**: Restricted origins in production

### Performance Optimizations
1. **Structured Output**: Eliminates parsing overhead
2. **Async Operations**: FastAPI async/await for I/O
3. **Bulk Operations**: Batch card creation to reduce DB calls
4. **Model Caching**: Single client instance reused
5. **Frontend Code Splitting**: Lazy loading of components

---

## Deployment

### Backend
- **Hosting**: Can be deployed to Render, Railway, or Google Cloud Run
- **Database**: SQLite for development, PostgreSQL for production
- **Environment Variables**: `GEMINI_API_KEY`, `JWT_SECRET`, `DATABASE_URL`

### Frontend
- **Hosting**: Vercel (current deployment at blueprint-pearl.vercel.app)
- **Build**: Vite production build with asset optimization
- **API Proxy**: Configured for backend endpoint

---

## Future Enhancements

1. **Real-time Multiplayer Practice**: Use Gemini Live API for conversation practice with multiple users
2. **Image OCR**: Extract text from photos of menus, signs, books
3. **Pronunciation Scoring**: Use Gemini audio models to score user pronunciation
4. **Adaptive Learning Paths**: Gemini analyzes user patterns and suggests personalized content
5. **Community Content**: Users share analyzed articles with vocabulary annotations
6. **Mobile Apps**: Native iOS/Android apps with offline flashcard support

---

## Conclusion

Blueprint demonstrates how Gemini 3's advanced features can transform language learning from passive to active, from generic to contextual, and from text-only to truly multimodal. By leveraging Native Structured Output, Extended Context Windows, and Multimodal capabilities, Blueprint provides a seamless learning experience that adapts to whatever content the student wants to learn from.
