# Blueprint - 3-Minute Hackathon Demo Script

## Opening (0:00 - 0:20) - 20 seconds

"Hi! I'm presenting **Blueprint**, an AI-powered language learning platform that transforms how students learn languages through intelligent, context-aware analysis. Let me show you how we're leveraging Google's Gemini 3 to solve a critical problem in language education."

## Problem Statement (0:20 - 0:40) - 20 seconds

"Traditional language learning tools give you dictionary definitions and generic grammar rules. But when you encounter a word in an actual article or video, you're left wondering: How is this used in context? What grammar patterns are at play? How do native speakers actually use this?"

"Blueprint solves this by providing **instant, contextual analysis** of any content you're reading or watching."

## Solution Overview & Demo Start (0:40 - 1:10) - 30 seconds

**[SCREEN: Show the Reader Library]**

"Here's how it works. I can import content from any source - articles, PDFs, or even paste text directly. For this demo, I'll select a Spanish article at B1 level."

**[SCREEN: Click on article, show text with vocabulary panel]**

"As I read, I can click any word or phrase. Watch what happens..."

**[SCREEN: Click a word, show analysis popup]**

"Instantly, Gemini 3 gives me: translation, grammatical breakdown with detailed explanations, vocabulary components, example sentences, and memory aids - all tailored to the specific context where this word appeared."

## Gemini 3 Features - Core Text Analysis (1:10 - 1:40) - 30 seconds

**[SCREEN: Show analysis results]**

"This is powered by Gemini 3's **Native Structured Output** feature. Instead of getting raw text that I'd need to parse, Gemini 3 returns perfectly structured JSON matching my Pydantic schemas. This ensures every analysis has consistent fields: translation, grammar breakdown, vocabulary items with pinyin for Chinese, usage examples, and difficulty levels."

**[SCREEN: Show long content analysis or book import]**

"For longer content, we leverage Gemini 3's **extended context window**. I can upload an entire book chapter, and Gemini analyzes the complete text to extract the top 50 most useful vocabulary words, identify 15 grammar patterns, map difficulty progression, and even suggest discussion questions."

## Gemini 3 Features - Multimodal Capabilities (1:40 - 2:20) - 40 seconds

**[SCREEN: Navigate to Video Learning tab]**

"Now here's where it gets exciting - Gemini 3's **multimodal capabilities**. Let me upload a video."

**[SCREEN: Upload video, show processing]**

"Gemini 3's vision model is analyzing this video right now. It's extracting timestamped subtitles, identifying vocabulary with context, and finding grammar patterns - all from video and audio combined."

**[SCREEN: Show results - subtitles, vocabulary with timestamps]**

"Look at this - synchronized subtitles I can click to jump to any moment. Every word has a timestamp so I can hear its pronunciation in context. Gemini 3 even generates comprehension questions, fill-in-blank exercises, and grammar practice exercises automatically."

**[SCREEN: Click on vocabulary item to show timestamp jump]**

"Click any vocabulary word, and it jumps to that exact moment in the video. This is multimodal learning powered by Gemini 3."

## Additional Features (2:20 - 2:45) - 25 seconds

**[SCREEN: Show conversation practice or audio tutor]**

"We also use Gemini 3's **audio processing** for conversation practice. I can speak in my target language, and Gemini transcribes my pronunciation, provides detailed phonetic feedback, corrects grammar mistakes, and replies naturally to continue the conversation."

**[SCREEN: Show flashcard system]**

"All the vocabulary I save automatically becomes flashcards with spaced repetition. Gemini's **reasoning model** generates contextual example sentences and personalized exercises based on my learning patterns."

## Architecture & Technical Implementation (2:45 - 3:00) - 15 seconds

**[SCREEN: Show architecture diagram or quick code snippet]**

"Technically, Blueprint uses:
- **Gemini 3 Flash** for fast analysis and chat responses
- **Gemini 3 Pro** for complex reasoning tasks like long-form analysis
- **Native Structured Output** with Pydantic schemas for reliable parsing
- **Multimodal capabilities** for video and audio processing
- **FastAPI** backend with **React** frontend
- **SQLAlchemy** for vocabulary tracking and spaced repetition"

## Closing (3:00) - 5 seconds

"Blueprint makes Gemini 3 central to every aspect of language learning - turning any content into an interactive lesson. Thank you!"

---

## Technical Notes for Q&A

### Gemini 3 Features Used:

1. **Native Structured Output** (PRIMARY FEATURE)
   - Location: `backend/services/gemini.py` lines 56-63
   - Implementation: Using `response_schema` parameter with Pydantic models
   - Example: `AnalysisResponse`, `LongContentAnalysisResponse`, `AudioTutorResponse`
   - Benefit: Guarantees consistent, parseable responses without error-prone text parsing

2. **Extended Context Window** (PRIMARY FEATURE)
   - Location: `backend/services/gemini.py` lines 199-250
   - Implementation: `analyze_long_content()` method
   - Usage: Processing entire books/articles (up to 2M tokens)
   - Benefit: Comprehensive vocabulary extraction and grammar analysis from long texts

3. **Multimodal (Vision + Audio)** (PRIMARY FEATURE)
   - Location: `backend/services/video_processor.py` lines 29-126
   - Implementation: Video file uploaded as `types.Part.from_bytes()` with `mime_type="video/mp4"`
   - Model: `gemini-3-flash-preview` (vision variant)
   - Benefit: Extract subtitles, vocabulary, and grammar directly from videos

4. **Audio Processing** (SUPPORTING FEATURE)
   - Location: `backend/services/gemini.py` lines 104-150
   - Implementation: `process_audio_tutor()` with audio file transcription
   - Benefit: Real-time pronunciation feedback and conversation practice

5. **Live Chat API** (SUPPORTING FEATURE)
   - Location: `backend/services/gemini.py` lines 185-197
   - Implementation: `client.chats.create()` with conversation history
   - Benefit: Stateful conversations with feedback

6. **Centralized Model Configuration** (BEST PRACTICE)
   - Location: `backend/config/gemini_models.py`
   - Models: default, reasoning, audio, vision, tts, live
   - All set to `gemini-3-flash-preview` variants

### Architecture:

**Backend:**
- FastAPI REST API
- SQLAlchemy ORM
- Pydantic for data validation and Gemini schemas
- Modular service layer (GeminiService, VideoProcessor, CardService)

**Frontend:**
- React 19 with TypeScript
- Vite build tool
- Context API for state management
- Axios for API calls

**Data Flow:**
```
User uploads content → Backend receives file
→ GeminiService/VideoProcessor calls Gemini 3 API with structured schemas
→ Gemini returns JSON matching Pydantic models
→ Data saved to SQLite (words, flashcards, reading content)
→ Frontend displays interactive UI
→ User clicks word → New Gemini analysis → Instant feedback
```

### Key Technical Decisions:

1. **Native Structured Output over prompt engineering**: Eliminates parsing errors and ensures data consistency
2. **Separate models for different tasks**: Flash for speed, Pro for reasoning
3. **Pydantic schemas as single source of truth**: Used for both API validation and Gemini responses
4. **Service layer pattern**: Keeps Gemini logic isolated and testable
5. **Flashcard generation via templates**: Jinja2 templates + Gemini-analyzed vocabulary

### Unique Value Proposition:

Blueprint is not just a language learning tool - it's a **context-aware AI tutor** that adapts to whatever content the student wants to learn from. Whether it's a news article, a novel, or a YouTube video, Gemini 3's multimodal capabilities transform it into an interactive lesson with instant feedback, personalized exercises, and cultural context.
