"""
Enterprise AI Research Assistant API Entry Point
Configures FastAPI application, request-tracing middleware, CORS, lifecycle hooks, and versioned routes.
"""
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.logger import logger
from app.database.database import init_db
from app.api.papers import router as papers_router
from app.api.chat import router as chat_router
from app.api.comparison import router as comparison_router
from app.api.academic import router as academic_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook for startup DB initialization and shutdown cleanup."""
    logger.info(f"Starting Enterprise {settings.APP_NAME} v{settings.APP_VERSION}...")
    init_db()
    yield
    logger.info("Shutting down AI Assistant backend services...")

app = FastAPI(
    title=f"{settings.APP_NAME} (Enterprise Edition)",
    version=settings.APP_VERSION,
    description="Enterprise-Grade RAG Architecture with Hybrid Search (BM25 + Vector + Cross-Encoder), Autonomous Literature Reviews, Audio Podcast Briefings, and Multi-Format Exports.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https://.*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Request ID & Latency Tracing Middleware
@app.middleware("http")
async def tracing_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-MS"] = str(process_time_ms)
    
    logger.info(f"[{request.method}] {request.url.path} - Status: {response.status_code} ({process_time_ms} ms) [ReqID: {request_id[:8]}]")
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal Server Error",
            "detail": str(exc)
        }
    )

# Direct API Router mounts
app.include_router(papers_router)
app.include_router(chat_router)
app.include_router(comparison_router)
app.include_router(academic_router)

# Versioned API Router Hierarchy (/api/v1)
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(papers_router)
v1_router.include_router(chat_router)
v1_router.include_router(comparison_router)
v1_router.include_router(academic_router)

@v1_router.get("/health")
@app.get("/health")
def health_check():
    groq_configured = bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your_groq_api_key_here")
    return {
        "status": "healthy",
        "edition": "Enterprise",
        "groq_api_configured": groq_configured,
        "groq_model": settings.GROQ_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "hybrid_retrieval": True,
        "cross_encoder_reranking": True,
        "chunk_size": settings.CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP,
        "top_k": settings.TOP_K_RETRIEVAL
    }

app.include_router(v1_router)

@app.get("/")
def read_root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "edition": "Enterprise AI Engineer Edition",
        "status": "online",
        "retrieval_architecture": "Hybrid BM25 + Dense Vector Search (RRF + Cross-Encoder Reranker)",
        "docs_url": "/docs"
    }
