"""
Vector Database Service (ChromaDB)
Responsible for persisting chunk embeddings, texts, and page metadata into a local persistent ChromaDB vector store.
Provides functions for indexing, metadata filtering, vector deletion, and Semantic Similarity Search (Top-K Retrieval).
"""
import os
import chromadb
from typing import List, Dict, Optional
from app.config import settings
from app.services.embedding_service import generate_single_embedding

_CHROMA_CLIENT: chromadb.PersistentClient = None
DEFAULT_COLLECTION_NAME = "research_papers"

def get_chroma_client() -> chromadb.PersistentClient:
    """
    Singleton loader for ChromaDB PersistentClient.
    Stores vector collection locally in data/chroma/
    """
    global _CHROMA_CLIENT
    if _CHROMA_CLIENT is None:
        persist_dir = settings.CHROMA_PERSIST_DIR
        os.makedirs(persist_dir, exist_ok=True)
        print(f"[ChromaDB Service] Initializing persistent client at: {persist_dir}")
        _CHROMA_CLIENT = chromadb.PersistentClient(path=persist_dir)
    return _CHROMA_CLIENT

def get_or_create_collection(collection_name: str = DEFAULT_COLLECTION_NAME):
    """
    Gets or creates a ChromaDB collection configured with Cosine Distance space.
    """
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

def index_paper_chunks(
    paper_id: str, 
    paper_name: str, 
    chunks: List[Dict], 
    embeddings: List[List[float]],
    collection_name: str = DEFAULT_COLLECTION_NAME
) -> int:
    """
    Upserts chunks, 384-dimensional vector embeddings, and metadata into ChromaDB collection.
    """
    if not chunks or not embeddings or len(chunks) != len(embeddings):
        raise ValueError("Chunks list and embeddings list must be non-empty and equal in length.")

    collection = get_or_create_collection(collection_name)

    ids = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunks):
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

    # Upsert into ChromaDB
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )

    print(f"[ChromaDB Service] Successfully indexed {len(ids)} chunks for paper '{paper_name}' ({paper_id}).")
    return len(ids)

def search_similar_chunks(
    query_text: str, 
    top_k: int = 3, 
    paper_id: Optional[str] = None,
    collection_name: str = DEFAULT_COLLECTION_NAME
) -> List[Dict]:
    """
    Semantic Similarity Search (Stage 7):
    1. Converts query_text to a 384-dimensional query vector using all-MiniLM-L6-v2
    2. Queries ChromaDB collection for nearest neighbors using Cosine similarity
    3. Converts Cosine Distance to Similarity Percentage (1.0 - distance)
    4. Returns ranked list of top-K results with text, similarity scores, and page numbers
    """
    collection = get_or_create_collection(collection_name)

    if collection.count() == 0:
        return []

    # 1. Generate Query Vector
    query_vector = generate_single_embedding(query_text)
    if not query_vector:
        return []

    # 2. Build metadata filter if searching within a specific paper
    where_clause = {"paper_id": paper_id} if paper_id else None

    # Limit top_k to actual available vectors in collection
    actual_k = min(top_k, collection.count())

    # 3. Perform Vector Query in ChromaDB
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
        # Convert Cosine distance (0.0 to 2.0) into similarity score (0.0 to 1.0)
        # Cosine Distance = 1 - Cosine Similarity (for normalized vectors)
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

def delete_paper_chunks_from_vector_db(
    paper_id: str, 
    collection_name: str = DEFAULT_COLLECTION_NAME
) -> int:
    """
    Deletes all vector items matching paper_id metadata from ChromaDB collection.
    """
    try:
        collection = get_or_create_collection(collection_name)
        results = collection.get(where={"paper_id": paper_id})
        matching_ids = results.get("ids", [])

        if matching_ids:
            collection.delete(ids=matching_ids)
            print(f"[ChromaDB Service] Deleted {len(matching_ids)} vectors for paper_id: {paper_id}")
            return len(matching_ids)
    except Exception as e:
        print(f"[ChromaDB Delete Warning]: {e}")
    return 0

def get_vector_db_stats(collection_name: str = DEFAULT_COLLECTION_NAME) -> Dict:
    """
    Returns current ChromaDB collection metrics.
    """
    try:
        collection = get_or_create_collection(collection_name)
        count = collection.count()
        return {
            "collection_name": collection_name,
            "total_vectors": count,
            "persist_directory": settings.CHROMA_PERSIST_DIR,
            "status": "online"
        }
    except Exception as e:
        return {
            "collection_name": collection_name,
            "total_vectors": 0,
            "persist_directory": settings.CHROMA_PERSIST_DIR,
            "status": f"error: {str(e)}"
        }
