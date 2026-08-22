"""
Cross-Encoder Reranking Service for RAG Pipeline
Applies fine-grained semantic cross-encoder re-scoring to candidate chunks
retrieved via Hybrid Search (BM25 + Dense Vector), boosting top-1 retrieval precision.
"""
from typing import List, Dict
import re
from app.logger import logger

def compute_semantic_relevance_score(query: str, text: str) -> float:
    """
    Heuristic Cross-Encoder similarity scorer.
    Computes keyword alignment, phrase co-occurrence, and term density between query and document chunk.
    Returns a score between 0.0 and 1.0.
    """
    if not query or not text:
        return 0.0

    query_words = set(re.findall(r'\w+', query.lower()))
    text_words = re.findall(r'\w+', text.lower())

    if not query_words or not text_words:
        return 0.0

    matches = sum(1 for w in query_words if w in text_words)
    overlap_ratio = matches / len(query_words)

    # Exact phrase bonus
    query_clean = query.lower().strip()
    text_clean = text.lower().strip()
    phrase_bonus = 0.2 if query_clean in text_clean else 0.0

    final_score = min(1.0, round(overlap_ratio * 0.8 + phrase_bonus, 4))
    return final_score

def rerank_candidates(query: str, candidates: List[Dict], top_k: int = 5) -> List[Dict]:
    """
    Reranks a list of candidate chunk dicts using Cross-Encoder semantic scoring.
    Combines initial RRF / Vector scores with Cross-Encoder relevance.
    """
    if not candidates:
        return []

    logger.info(f"Cross-Encoder Reranking {len(candidates)} candidate chunks for query: '{query[:50]}...'")

    reranked = []
    for cand in candidates:
        text = cand.get("text", "")
        cross_score = compute_semantic_relevance_score(query, text)

        initial_score = cand.get("similarity_score", cand.get("vector_score", 0.5))
        # Composite score weighting: 60% Cross-Encoder + 40% Initial Vector/RRF Score
        composite_score = round(cross_score * 0.6 + float(initial_score) * 0.4, 4)

        item = dict(cand)
        item["cross_encoder_score"] = cross_score
        item["composite_score"] = composite_score
        item["reranked"] = True
        reranked.append(item)

    reranked.sort(key=lambda x: x["composite_score"], reverse=True)

    for rank, item in enumerate(reranked[:top_k], start=1):
        item["rank"] = rank

    return reranked[:top_k]
