"""
Enterprise Hybrid Retrieval Service (BM25 + Dense Vector Search + RRF Fusion)
Combines Sparse Lexical Keyword Retrieval (BM25) and Dense Semantic Vector Search (ChromaDB)
using Reciprocal Rank Fusion (RRF) to ensure high precision and recall for academic papers.
"""
import re
from typing import List, Dict, Optional
from rank_bm25 import BM25Okapi
from app.services.vector_service import search_similar_chunks
from app.logger import logger

def tokenize_text(text: str) -> List[str]:
    """
    Standard lowercased alphanumeric tokenizer for BM25 academic text indexing.
    """
    return re.findall(r'\w+', text.lower())

def perform_bm25_search(
    query: str, 
    corpus_chunks: List[Dict], 
    top_k: int = 5
) -> List[Dict]:
    """
    Performs BM25 lexical ranking over a list of document chunks.
    """
    if not corpus_chunks:
        return []

    tokenized_corpus = [tokenize_text(chunk.get("text", "")) for chunk in corpus_chunks]
    bm25 = BM25Okapi(tokenized_corpus)

    tokenized_query = tokenize_text(query)
    scores = bm25.get_scores(tokenized_query)

    scored_chunks = []
    for idx, score in enumerate(scores):
        if score > 0:
            chunk = dict(corpus_chunks[idx])
            chunk["bm25_score"] = float(score)
            scored_chunks.append(chunk)

    scored_chunks.sort(key=lambda x: x["bm25_score"], reverse=True)
    return scored_chunks[:top_k]

def reciprocal_rank_fusion(
    vector_results: List[Dict], 
    bm25_results: List[Dict], 
    top_k: int = 5,
    rrf_k: int = 60
) -> List[Dict]:
    """
    Combines dense vector search results and sparse BM25 search results using Reciprocal Rank Fusion (RRF).
    
    RRF Score = 1 / (rrf_k + vector_rank) + 1 / (rrf_k + bm25_rank)
    """
    fused_scores: Dict[str, Dict] = {}

    def get_chunk_key(c: Dict) -> str:
        paper_id = c.get("paper_id", "")
        chunk_idx = c.get("chunk_index", 0)
        return f"{paper_id}_chunk_{chunk_idx}" if paper_id else f"{c.get('text', '')[:50]}"

    # Process Vector Results
    for rank, chunk in enumerate(vector_results, start=1):
        key = get_chunk_key(chunk)
        if key not in fused_scores:
            fused_scores[key] = {
                "chunk": dict(chunk),
                "rrf_score": 0.0,
                "vector_rank": rank,
                "bm25_rank": None,
                "vector_score": chunk.get("similarity_score", 0.0),
                "bm25_score": 0.0
            }
        fused_scores[key]["rrf_score"] += 1.0 / (rrf_k + rank)

    # Process BM25 Results
    for rank, chunk in enumerate(bm25_results, start=1):
        key = get_chunk_key(chunk)
        if key not in fused_scores:
            fused_scores[key] = {
                "chunk": dict(chunk),
                "rrf_score": 0.0,
                "vector_rank": None,
                "bm25_rank": rank,
                "vector_score": 0.0,
                "bm25_score": chunk.get("bm25_score", 0.0)
            }
        else:
            fused_scores[key]["bm25_rank"] = rank
            fused_scores[key]["bm25_score"] = chunk.get("bm25_score", 0.0)

        fused_scores[key]["rrf_score"] += 1.0 / (rrf_k + rank)

    # Sort fused results by combined RRF score
    sorted_items = sorted(fused_scores.values(), key=lambda x: x["rrf_score"], reverse=True)

    result_list = []
    for rank, item in enumerate(sorted_items[:top_k], start=1):
        final_chunk = item["chunk"]
        final_chunk["rank"] = rank
        final_chunk["rrf_score"] = round(item["rrf_score"], 6)
        final_chunk["vector_rank"] = item["vector_rank"]
        final_chunk["bm25_rank"] = item["bm25_rank"]
        final_chunk["vector_score"] = round(item["vector_score"], 4)
        final_chunk["bm25_score"] = round(item["bm25_score"], 4)
        final_chunk["retrieval_method"] = "hybrid_bm25_vector"
        result_list.append(final_chunk)

    return result_list

def perform_hybrid_search(
    query_text: str,
    top_k: int = 5,
    paper_id: Optional[str] = None
) -> List[Dict]:
    """
    Executes Hybrid Search:
    1. Fetches candidate chunks via Dense Vector Search (ChromaDB)
    2. Fetches candidate chunks via BM25 Lexical Keyword Search
    3. Fuses candidates using Reciprocal Rank Fusion (RRF)
    """
    logger.info(f"Executing Hybrid RAG Search for query: '{query_text[:60]}...' (paper_id: {paper_id})")

    # Fetch top 2*K vector results to give fusion ample candidates
    vector_candidates = search_similar_chunks(
        query_text=query_text, 
        top_k=top_k * 2, 
        paper_id=paper_id
    )

    if not vector_candidates:
        return []

    # Run BM25 on retrieved vector candidate documents
    bm25_candidates = perform_bm25_search(
        query=query_text, 
        corpus_chunks=vector_candidates, 
        top_k=top_k * 2
    )

    # Apply Reciprocal Rank Fusion
    fused_results = reciprocal_rank_fusion(
        vector_results=vector_candidates,
        bm25_results=bm25_candidates,
        top_k=top_k
    )

    logger.info(f"Hybrid Search returned {len(fused_results)} fused candidate chunks.")
    return fused_results
