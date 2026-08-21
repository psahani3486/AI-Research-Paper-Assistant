import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Find the root directory (.env file location)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

class Settings(BaseSettings):
    """
    Application Settings
    Loads configuration from environment variables or .env file.
    """
    APP_NAME: str = "AI Research Paper Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Groq API Configuration
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "groq/compound")

    # Embedding Model Configuration
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")

    # RAG Hyperparameters
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", 800))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", 150))
    TOP_K_RETRIEVAL: int = int(os.getenv("TOP_K_RETRIEVAL", 5))

    # Server Configuration
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", 8000))

    # Storage Paths
    SQLITE_DB_PATH: str = str(ROOT_DIR / "data" / "assistant.db")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{ROOT_DIR}/data/assistant.db")
    CHROMA_PERSIST_DIR: str = str(ROOT_DIR / "data" / "chroma")
    UPLOAD_DIR: str = str(ROOT_DIR / "data" / "uploads")

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure required runtime directories exist
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(ROOT_DIR / "data", exist_ok=True)
