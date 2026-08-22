"""
Embedding Generation Service
Responsible for generating dense vector embeddings from text chunks using Sentence-Transformers (all-MiniLM-L6-v2).
"""
from typing import List, Any
from app.config import settings

# Global model instance cache (singleton pattern for fast CPU/GPU reuse)
_MODEL_INSTANCE: Any = None

def get_embedding_model() -> Any:
    """
    Lazy loads and returns the SentenceTransformer model instance.
    """
    global _MODEL_INSTANCE
    if _MODEL_INSTANCE is None:
        from sentence_transformers import SentenceTransformer
        model_name = settings.EMBEDDING_MODEL_NAME or "all-MiniLM-L6-v2"
        print(f"[Embedding Service] Loading model '{model_name}' into memory...")
        _MODEL_INSTANCE = SentenceTransformer(model_name)
        print(f"[Embedding Service] Model '{model_name}' loaded successfully (384 dimensions).")
    return _MODEL_INSTANCE

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Batch converts a list of text strings into 384-dimensional dense vectors.
    Returns List of float lists.
    """
    if not texts or len(texts) == 0:
        return []

    model = get_embedding_model()
    # normalize_embeddings=True ensures Cosine Similarity equals Dot Product
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
    return [e.tolist() for e in embeddings]

def generate_single_embedding(text: str) -> List[float]:
    """
    Converts a single text string (e.g. user question) into a 384-dimensional vector.
    """
    if not text:
        return []
    embeddings = generate_embeddings([text])
    return embeddings[0] if embeddings else []
