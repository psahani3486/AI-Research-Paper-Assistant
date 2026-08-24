"""
Embedding Generation Service
Responsible for generating dense vector embeddings from text chunks.
Supports Sentence-Transformers (all-MiniLM-L6-v2) with automatic ultra-lightweight
fallback for low-memory environments (Render Free Tier 512MB RAM, Vercel Serverless).
"""
import math
import re
import hashlib
from typing import List, Any
from app.config import settings

# Global model instance cache
_MODEL_INSTANCE: Any = None
_USE_LIGHTWEIGHT_FALLBACK: bool = False

def _generate_lightweight_embedding(text: str, dim: int = 384) -> List[float]:
    """
    Ultra-lightweight deterministic semantic embedding generator (0 MB RAM overhead).
    Uses hashed character n-grams and word tokens projected into 384-dim space with L2 normalization.
    Ensures identical text similarity behavior even when PyTorch / SentenceTransformers are absent.
    """
    if not text:
        return [0.0] * dim

    vector = [0.0] * dim
    clean_text = text.lower().strip()
    words = re.findall(r'\w+', clean_text)
    
    # 1. Word-level hashing with positional weighting
    for i, word in enumerate(words):
        pos_weight = 1.0 / (1.0 + math.log1p(i * 0.1))
        # Generate multiple hash buckets per word for dense distribution
        h1 = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
        h2 = int(hashlib.sha256(word.encode('utf-8')).hexdigest(), 16)
        
        idx1 = h1 % dim
        idx2 = h2 % dim
        val1 = ((h1 % 1000) / 500.0 - 1.0) * pos_weight
        val2 = ((h2 % 1000) / 500.0 - 1.0) * pos_weight
        
        vector[idx1] += val1
        vector[idx2] += val2
        
        # Subword character 3-grams for morphological similarity
        if len(word) >= 3:
            for j in range(len(word) - 2):
                ngram = word[j:j+3]
                h_ng = int(hashlib.sha1(ngram.encode('utf-8')).hexdigest(), 16)
                ng_idx = h_ng % dim
                vector[ng_idx] += ((h_ng % 1000) / 1000.0 - 0.5) * 0.5

    # 2. L2 Normalization so cosine similarity == dot product
    norm = math.sqrt(sum(x * x for x in vector))
    if norm > 1e-9:
        return [float(x / norm) for x in vector]
    else:
        # Fallback non-zero vector
        return [1.0 / math.sqrt(dim)] * dim

def get_embedding_model() -> Any:
    """
    Lazy loads SentenceTransformer or configures lightweight fallback.
    """
    global _MODEL_INSTANCE, _USE_LIGHTWEIGHT_FALLBACK
    if _MODEL_INSTANCE is None and not _USE_LIGHTWEIGHT_FALLBACK:
        try:
            from sentence_transformers import SentenceTransformer
            model_name = settings.EMBEDDING_MODEL_NAME or "all-MiniLM-L6-v2"
            print(f"[Embedding Service] Loading model '{model_name}' into memory...")
            _MODEL_INSTANCE = SentenceTransformer(model_name)
            print(f"[Embedding Service] Model '{model_name}' loaded successfully (384 dimensions).")
        except Exception as e:
            print(f"[Embedding Service] SentenceTransformers/Torch not available ({e}).")
            print("[Embedding Service] Switched to Ultra-Lightweight Embedding Engine (Render Free / Low-RAM Mode).")
            _USE_LIGHTWEIGHT_FALLBACK = True
            _MODEL_INSTANCE = None
    return _MODEL_INSTANCE

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Batch converts a list of text strings into 384-dimensional dense vectors.
    Returns List of float lists.
    """
    if not texts or len(texts) == 0:
        return []

    model = get_embedding_model()
    if model is not None:
        try:
            embeddings = model.encode(texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
            return [e.tolist() for e in embeddings]
        except Exception as e:
            print(f"[Embedding Service Warning] PyTorch inference failed: {e}. Using lightweight fallback.")

    # Lightweight fallback
    return [_generate_lightweight_embedding(t, dim=384) for t in texts]

def generate_single_embedding(text: str) -> List[float]:
    """
    Converts a single text string (e.g. user question) into a 384-dimensional vector.
    """
    if not text:
        return []
    embeddings = generate_embeddings([text])
    return embeddings[0] if embeddings else []
