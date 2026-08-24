"""
Vector Database Service
Responsible for persisting chunk embeddings, texts, and page metadata.
Supports ChromaDB with automatic lightweight SQLite/JSON fallback for low-memory
environments (Render Free Tier 512MB RAM, Vercel Serverless, etc.).
"""
import os
import json
import math
from typing import List, Dict, Optional, Any
from app.config import settings
from app.services.embedding_service import generate_single_embedding

_CHROMA_CLIENT: Any = None
_USE_LIGHTWEIGHT_STORE: bool = False
DEFAULT_COLLECTION_NAME = "research_papers"

# In-memory / file cache for lightweight mode
_LIGHTWEIGHT_STORE_FILE = os.path.join(settings.CHROMA_PERSIST_DIR, "lightweight_vectors.json")
_MEMORY_COLLECTIONS: Dict[str, Dict[str, Dict]] = {}

def _load_lightweight_store():
    global _MEMORY_COLLECTIONS
    if not _MEMORY_COLLECTIONS and os.path.exists(_LIGHTWEIGHT_STORE_FILE):
        try:
            with open(_LIGHTWEIGHT_STORE_FILE, "r", encoding="utf-8") as f:
                _MEMORY_COLLECTIONS = json.load(f)
        except Exception as e:
            print(f"[Lightweight Vector Store] Error loading cache: {e}")
            _MEMORY_COLLECTIONS = {}

def _save_lightweight_store():
    try:
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        with open(_LIGHTWEIGHT_STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(_MEMORY_COLLECTIONS, f)
    except Exception as e:
        print(f"[Lightweight Vector Store] Error saving cache: {e}")

def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 > 1e-9 and norm2 > 1e-9:
        return dot / (norm1 * norm2)
    return 0.0

def get_chroma_client() -> Any:
    """
    Singleton loader for ChromaDB PersistentClient or configures lightweight fallback.
    """
    global _CHROMA_CLIENT, _USE_LIGHTWEIGHT_STORE
    if _CHROMA_CLIENT is None and not _USE_LIGHTWEIGHT_STORE:
        try:
            import chromadb
            persist_dir = settings.CHROMA_PERSIST_DIR
            os.makedirs(persist_dir, exist_ok=True)
            print(f"[ChromaDB Service] Initializing persistent client at: {persist_dir}")
            _CHROMA_CLIENT = chromadb.PersistentClient(path=persist_dir)
        except Exception as e:
            print(f"[ChromaDB Service] ChromaDB not available ({e}).")
            print("[ChromaDB Service] Switched to Ultra-Lightweight Vector Engine (Render Free / Low-RAM Mode).")
            _USE_LIGHTWEIGHT_STORE = True
            _CHROMA_CLIENT = None
            _load_lightweight_store()
    return _CHROMA_CLIENT

def get_or_create_collection(collection_name: str = DEFAULT_COLLECTION_NAME):
    """
    Gets or creates a collection.
    """
    client = get_chroma_client()
    if client is not None:
        return client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
    # Lightweight collection handler
    _load_lightweight_store()
    if collection_name not in _MEMORY_COLLECTIONS:
        _MEMORY_COLLECTIONS[collection_name] = {}
    return collection_name

def index_paper_chunks(
    paper_id: str, 
    paper_name: str, 
    chunks: List[Dict], 
    embeddings: List[List[float]],
    collection_name: str = DEFAULT_COLLECTION_NAME
) -> int:
    """
    Upserts chunks, 384-dimensional vector embeddings, and metadata into vector collection.
    """
    if not chunks or not embeddings or len(chunks) != len(embeddings):
        raise ValueError("Chunks list and embeddings list must be non-empty and equal in length.")

    client = get_chroma_client()
    ids = []
    documents = []
    metadatas = []

    for chunk in chunks:
        chunk_idx = chunk["chunk_index"]
        page_num = chunk["page_number"]
        chunk_text = chunk["text"]
        chunk_id = f"{paper_id}_chunk_{chunk_idx}"

        ids.append(chunk_id)
        documents.append(chunk_text)
        metadatas.append({
            "paper_id": paper_id,
            "paper_name": paper_name,
            "page_number": page_num,
            "chunk_index": chunk_idx
        })

    if client is not None:
        collection = get_or_create_collection(collection_name)
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
    else:
        # Lightweight store indexing
        _load_lightweight_store()
        if collection_name not in _MEMORY_COLLECTIONS:
            _MEMORY_COLLECTIONS[collection_name] = {}
        for cid, doc, meta, emb in zip(ids, documents, metadatas, embeddings):
            _MEMORY_COLLECTIONS[collection_name][cid] = {
                "document": doc,
                "metadata": meta,
                "embedding": emb
            }
        _save_lightweight_store()

    print(f"[Vector Service] Successfully indexed {len(ids)} chunks for paper '{paper_name}' ({paper_id}).")
    return len(ids)

def search_similar_chunks(
    query_text: str, 
    top_k: int = 3, 
    paper_id: Optional[str] = None,
    collection_name: str = DEFAULT_COLLECTION_NAME
) -> List[Dict]:
    """
    Semantic Similarity Search:
    1. Converts query_text to query vector
    2. Computes nearest neighbors using Cosine similarity
    3. Returns ranked list of top-K results with text, similarity scores, and page numbers
    """
    query_vector = generate_single_embedding(query_text)
    if not query_vector:
        return []

    client = get_chroma_client()
    if client is not None:
        collection = get_or_create_collection(collection_name)
        if collection.count() == 0:
            return []

        where_clause = {"paper_id": paper_id} if paper_id else None
        actual_k = min(top_k, collection.count())

        query_results = collection.query(
            query_embeddings=[query_vector],
            n_results=actual_k,
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )

        docs = query_results.get("documents", [[]])[0]
        metas = query_results.get("metadatas", [[]])[0]
        dists = query_results.get("distances", [[]])[0]

        ranked_results = []
        for rank_idx, (doc, meta, dist) in enumerate(zip(docs, metas, dists), start=1):
            similarity_score = max(0.0, 1.0 - float(dist))
            similarity_pct = round(similarity_score * 100, 1)

            ranked_results.append({
                "rank": rank_idx,
                "chunk_index": meta.get("chunk_index", 0),
                "page_number": meta.get("page_number", 1),
                "paper_id": meta.get("paper_id", ""),
                "paper_name": meta.get("paper_name", "Research Paper"),
                "similarity_score": round(similarity_score, 4),
                "similarity_percentage": similarity_pct,
                "text": doc
            })
        return ranked_results

    # Lightweight store search
    _load_lightweight_store()
    col_items = _MEMORY_COLLECTIONS.get(collection_name, {})
    if not col_items:
        return []

    scored_items = []
    for item_id, item_data in col_items.items():
        meta = item_data.get("metadata", {})
        if paper_id and meta.get("paper_id") != paper_id:
            continue

        emb = item_data.get("embedding", [])
        sim = _cosine_similarity(query_vector, emb)
        scored_items.append({
            "chunk_index": meta.get("chunk_index", 0),
            "page_number": meta.get("page_number", 1),
            "paper_id": meta.get("paper_id", ""),
            "paper_name": meta.get("paper_name", "Research Paper"),
            "similarity_score": round(sim, 4),
            "similarity_percentage": round(sim * 100, 1),
            "text": item_data.get("document", "")
        })

    scored_items.sort(key=lambda x: x["similarity_score"], reverse=True)
    for rank, item in enumerate(scored_items[:top_k], start=1):
        item["rank"] = rank

    return scored_items[:top_k]

def delete_paper_chunks_from_vector_db(
    paper_id: str, 
    collection_name: str = DEFAULT_COLLECTION_NAME
) -> int:
    """
    Deletes all vector items matching paper_id metadata from vector store.
    """
    try:
        client = get_chroma_client()
        if client is not None:
            collection = get_or_create_collection(collection_name)
            results = collection.get(where={"paper_id": paper_id})
            matching_ids = results.get("ids", [])

            if matching_ids:
                collection.delete(ids=matching_ids)
                print(f"[Vector Service] Deleted {len(matching_ids)} vectors for paper_id: {paper_id}")
                return len(matching_ids)
            return 0
        
        # Lightweight delete
        _load_lightweight_store()
        col = _MEMORY_COLLECTIONS.get(collection_name, {})
        to_delete = [k for k, v in col.items() if v.get("metadata", {}).get("paper_id") == paper_id]
        for k in to_delete:
            del col[k]
        if to_delete:
            _save_lightweight_store()
            print(f"[Vector Service] Deleted {len(to_delete)} vectors for paper_id: {paper_id}")
        return len(to_delete)
    except Exception as e:
        print(f"[Vector DB Delete Warning]: {e}")
    return 0

def get_vector_db_stats(collection_name: str = DEFAULT_COLLECTION_NAME) -> Dict:
    """
    Returns current vector store metrics.
    """
    try:
        client = get_chroma_client()
        if client is not None:
            collection = get_or_create_collection(collection_name)
            count = collection.count()
            return {
                "collection_name": collection_name,
                "total_vectors": count,
                "engine": "ChromaDB",
                "persist_directory": settings.CHROMA_PERSIST_DIR,
                "status": "online"
            }
        
        _load_lightweight_store()
        col = _MEMORY_COLLECTIONS.get(collection_name, {})
        return {
            "collection_name": collection_name,
            "total_vectors": len(col),
            "engine": "LightweightVectorEngine",
            "persist_directory": settings.CHROMA_PERSIST_DIR,
            "status": "online"
        }
    except Exception as e:
        return {
            "collection_name": collection_name,
            "total_vectors": 0,
            "engine": "Fallback",
            "persist_directory": settings.CHROMA_PERSIST_DIR,
            "status": f"error: {str(e)}"
        }

