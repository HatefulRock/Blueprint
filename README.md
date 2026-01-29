<div align="center">
<img width="1200" height="475" alt="Blueprint Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 📘 Blueprint

### AI-Powered Language Learning Platform

Transform any content into an interactive lesson with Google's Gemini 3

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://blueprint-pearl.vercel.app/)
[![Gemini 3](https://img.shields.io/badge/Powered%20by-Gemini%203-blue)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688)](https://fastapi.tiangolo.com/)

[🎬 Watch Demo](#demo) • [✨ Features](#features) • [🚀 Quick Start](#quick-start) • [📚 Documentation](#documentation)

</div>

---

## 🎯 What is Blueprint?

Blueprint is a multimodal AI language learning platform that transforms any content—articles, videos, or audio—into interactive lessons. Powered by Google's Gemini 3, it provides instant, contextual analysis of foreign language content with grammar breakdowns, cultural notes, and personalized exercises.

**The Problem**: Traditional language tools give generic dictionary definitions without context. When you encounter a word in a real article or video, you're left wondering: *How is this actually used? What grammar patterns are involved? How do native speakers use this?*

**The Solution**: Click any word, upload any video, or import any article—Blueprint's AI provides instant, comprehensive analysis tailored to your learning level.

---

## ✨ Features

### 📖 Interactive Reader
- **Instant Word Analysis**: Click any word for translation, grammar breakdown, usage examples, and memory aids
- **Context-Aware Learning**: Every analysis considers the sentence where the word appears
- **Long Content Support**: Import entire book chapters with comprehensive vocabulary extraction
- **Multiple Import Options**: URLs, PDFs, text files, or paste directly

### 🎥 Video Learning Lab (Multimodal AI)
- **Automatic Subtitle Generation**: Gemini 3 Vision extracts timestamped subtitles from any video
- **Clickable Vocabulary**: Click words to jump to exact moments in the video
- **Grammar Pattern Identification**: AI identifies grammar structures demonstrated in videos
- **Auto-Generated Exercises**: Comprehension questions, fill-in-blanks, and pronunciation challenges

### 🗣️ Conversation Practice
- **Audio Tutor**: Speak in your target language and get pronunciation feedback
- **Live Chat Practice**: Realistic conversation scenarios with grammar corrections
- **Cultural Context**: Learn idioms and regional expressions in context

### 📇 Smart Flashcard System
- **Spaced Repetition**: SM-2 algorithm for optimal review scheduling
- **Context-Rich Cards**: Every flashcard includes the original sentence
- **Custom Templates**: Design your own card layouts with Jinja2 templates
- **Bulk Generation**: Create flashcards from any analyzed content

### 📊 Progress Tracking
- **Streaks & Points**: Gamified learning with daily goals
- **Vocabulary Dashboard**: Track words by difficulty level (A1-C2)
- **Practice Sessions**: Review statistics and performance analytics

---

## 🤖 Gemini 3 Integration

Blueprint showcases advanced Gemini 3 features:

### 🎯 Native Structured Output
Every API call uses Pydantic schemas for guaranteed JSON responses. No parsing errors, just reliable data.

```python
response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schemas.AnalysisResponse
    ),
)
result = response.parsed.model_dump()  # Already structured!
```

### 📚 Extended Context Window
Analyze entire book chapters (10,000+ words) in a single request to rank vocabulary by usefulness across the full text.

### 🎬 Multimodal (Vision + Audio)
Process video + audio + text simultaneously. One API call extracts subtitles, identifies vocabulary with timestamps, and generates exercises.

### 🗣️ Audio Processing
Transcribe speech and provide detailed pronunciation feedback with phonetic hints.

### 💬 Live Chat API
Stateful conversations with maintained history for natural dialogue practice.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Gemini API Key ([Get one here](https://ai.google.dev/))

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env
echo "JWT_SECRET=your_secret_key" >> .env

# Run database migrations (automatic on first run)
# Start the server
uvicorn main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env.local file (optional, for custom API endpoint)
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Quick Test

1. Open http://localhost:5173
2. Create an account
3. Go to Library → Click a sample Spanish article
4. Click any word to see instant AI analysis

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   React Frontend (TypeScript + Vite)    │
│   - Reader View                          │
│   - Video Learning                       │
│   - Flashcard System                     │
└──────────────┬──────────────────────────┘
               │ REST API
               ▼
┌─────────────────────────────────────────┐
│   FastAPI Backend (Python)              │
│   ├─ GeminiService                      │
│   ├─ VideoProcessor                     │
│   ├─ CardService                        │
│   └─ Auth & Database                    │
└──────────────┬──────────────────────────┘
               │ API Calls
               ▼
┌─────────────────────────────────────────┐
│   Gemini 3 API                          │
│   ├─ Flash (fast analysis)              │
│   ├─ Pro (reasoning)                    │
│   └─ Vision (multimodal)                │
└─────────────────────────────────────────┘
```

### Tech Stack

**Frontend**
- React 19 with TypeScript
- Vite for build tooling
- Axios for API calls
- Context API for state management

**Backend**
- FastAPI (async Python web framework)
- SQLAlchemy ORM with SQLite
- Pydantic for validation and Gemini schemas
- JWT authentication with argon2 hashing

**AI/ML**
- Gemini 3 Flash (default, fast tasks)
- Gemini 3 Pro (complex reasoning)
- Gemini 3 Vision (multimodal analysis)
- Google GenAI SDK

---

## 📚 Documentation

- **[DEMO_SCRIPT.md](DEMO_SCRIPT.md)** - 3-minute hackathon presentation script
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Full system architecture with diagrams
- **[GEMINI_FEATURES_SUMMARY.md](GEMINI_FEATURES_SUMMARY.md)** - Detailed Gemini 3 feature breakdown
- **[HACKATHON_PRESENTATION.md](HACKATHON_PRESENTATION.md)** - Complete presentation guide
- **[JUDGE_HANDOUT.md](JUDGE_HANDOUT.md)** - One-page reference for judges

---

## 🎬 Demo

**Live Application**: [https://blueprint-pearl.vercel.app/](https://blueprint-pearl.vercel.app/)

### Try These Features:

1. **Text Analysis**
   - Go to Library → Select a Spanish article
   - Click any word for instant AI analysis
   - See grammar breakdowns and usage examples

2. **Video Learning**
   - Upload a short video (MP4, under 50MB)
   - Watch Gemini extract subtitles automatically
   - Click vocabulary to jump to timestamps

3. **Flashcards**
   - Save words from your reading
   - Review with spaced repetition
   - Track your progress

---

## 🗂️ Project Structure

```
Blueprint/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── models.py              # SQLAlchemy database models
│   ├── schemas.py             # Pydantic schemas (API + Gemini)
│   ├── services/
│   │   ├── gemini.py          # Gemini API service
│   │   ├── video_processor.py # Video analysis
│   │   ├── card_service.py    # Flashcard generation
│   │   ├── auth.py            # JWT authentication
│   │   └── database.py        # Database connection
│   ├── routers/               # API endpoints
│   │   ├── words.py
│   │   ├── video.py
│   │   ├── ai.py
│   │   └── ...
│   └── config/
│       └── gemini_models.py   # Model configuration
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ReaderView.tsx
│   │   │   ├── VideoLearningView.tsx
│   │   │   ├── FlashcardView.tsx
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── api.ts         # Axios API client
│   │   │   └── geminiService.ts
│   │   ├── context/
│   │   │   └── AppContext.tsx # Global state
│   │   └── types.ts           # TypeScript types
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 🌍 Supported Languages

**Full Support**: Spanish, French, German, Italian, Portuguese, Chinese (Mandarin), Japanese

**Beta Support**: Korean, Russian, Arabic, Hindi

*Technically supports any language Gemini 3 knows - the limitation is our curated content library.*

---

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`)
```env
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_key
DATABASE_URL=sqlite:///./language_tutor.db
```

**Frontend** (`.env.local`)
```env
VITE_API_URL=http://localhost:8000
```

### Gemini Model Selection

Edit `backend/config/gemini_models.py` to customize which Gemini models to use:

```python
GEMINI_MODELS = {
    "default": "gemini-3-flash-preview",
    "reasoning": "gemini-3-flash-preview",
    "vision": "gemini-3-flash-preview",
    # ...
}
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test
```

---

## 🚀 Deployment

### Backend (Railway / Render / Google Cloud Run)

1. Set environment variables in your hosting platform
2. Use provided `Dockerfile` or `requirements.txt`
3. Set command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel)

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL` pointing to your backend

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini 3** for powerful multimodal AI capabilities
- **FastAPI** for the excellent Python web framework
- **React** team for the frontend library
- All open-source contributors whose libraries made this possible

---

## 📧 Contact

For questions, feedback, or collaboration opportunities:

- **Live Demo**: [https://blueprint-pearl.vercel.app/](https://blueprint-pearl.vercel.app/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/blueprint/issues)
- **Documentation**: See docs in this repository

---

<div align="center">

**Built with ❤️ using Gemini 3**

Made for the Google Gemini 3 Hackathon

[⬆ Back to Top](#-blueprint)

</div>
