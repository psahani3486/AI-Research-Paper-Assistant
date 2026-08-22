from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.database import init_db
from app.api.papers import router as papers_router
from app.api.chat import router as chat_router
from app.api.comparison import router as comparison_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}...")
    init_db()
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="A simple, modular RAG-powered AI Research Paper Assistant for college BTP projects.",
    lifespan=lifespan
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Include API Routers
app.include_router(papers_router)
app.include_router(chat_router)
app.include_router(comparison_router)

@app.get("/")
def read_root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    groq_configured = bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your_groq_api_key_here")
    return {
        "status": "healthy",
        "groq_api_configured": groq_configured,
        "groq_model": settings.GROQ_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "chunk_size": settings.CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP,
        "top_k": settings.TOP_K_RETRIEVAL
    }
