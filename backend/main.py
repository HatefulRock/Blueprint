import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, users, words, content, ai, conversation, leaderboard, analytics, writing, grammar, templates, vocab, practice, video
from models import (
    User,
    Deck,
    Word,
    Goal,
    ReadingContent,
    PracticeSession,
    PracticeReview,
)
from services.database import engine, Base
import logging


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler() # Output to console
        # You could add a FileHandler here to save to a file: logging.FileHandler("app.log")
    ]
)
logger = logging.getLogger("main")


# Ensure tables exist (development only)
Base.metadata.create_all(bind=engine)


app = FastAPI()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Middleware to log details of every request and the time it took to process.
    """
    start_time = time.time()
    
    # Log the incoming request
    logger.info(f"Incoming Request: {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        
        # Calculate processing time
        process_time = (time.time() - start_time) * 1000
        
        # Log the response status and duration
        logger.info(
            f"Completed: {request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Duration: {process_time:.2f}ms"
        )
        return response
    except Exception as e:
        # Log unhandled exceptions caught by middleware
        process_time = (time.time() - start_time) * 1000
        logger.error(
            f"Request Failed: {request.method} {request.url.path} "
            f"- Duration: {process_time:.2f}ms - Error: {str(e)}",
            exc_info=True
        )
        raise e

# 1. For development, allow all origins so CORS won't block requests from local frontends
origins = ["*","https://blueprint-pearl.vercel.app/"]

# 2. Add the Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],
)

# 3. Include your routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(words.router)
app.include_router(content.router)
app.include_router(ai.router)
app.include_router(conversation.router)
app.include_router(leaderboard.router)
app.include_router(analytics.router)
app.include_router(writing.router)
app.include_router(grammar.router)
app.include_router(templates.router)
app.include_router(vocab.router)
app.include_router(practice.router)
app.include_router(video.router)

@app.get("/")
def root():
    return {"message": "API is online"}
