from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import users, words, content, ai, conversation, leaderboard, analytics
from backend.models import (
    User,
    Deck,
    Word,
    Goal,
    ReadingContent,
    PracticeSession,
    PracticeReview,
)
from backend.services.database import engine, Base

# Ensure tables exist (development only)
Base.metadata.create_all(bind=engine)


app = FastAPI()

# 1. Define allowed origins
origins = [
    "http://localhost:3000",
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:3000",
]

# 2. Add the Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],
)

# 3. Include your routers
app.include_router(users.router)
app.include_router(words.router)
app.include_router(content.router)
app.include_router(ai.router)
app.include_router(conversation.router)
app.include_router(leaderboard.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {"message": "API is online"}
