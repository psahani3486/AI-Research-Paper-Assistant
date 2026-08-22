"""
Unit Tests for Hybrid Retrieval (BM25 + Vector + Reciprocal Rank Fusion)
"""
import pytest
from app.services.hybrid_retrieval_service import tokenize_text, perform_bm25_search, reciprocal_rank_fusion

def test_tokenize_text():
    text = "Attention Is All You Need! (2017)"
    tokens = tokenize_text(text)
    assert tokens == ["attention", "is", "all", "you", "need", "2017"]

def test_perform_bm25_search():
    corpus = [
        {"text": "Transformers rely entirely on self-attention mechanisms.", "paper_id": "p1", "chunk_index": 0},
        {"text": "Convolutional networks process spatial images efficiently.", "paper_id": "p2", "chunk_index": 0},
        {"text": "Attention mechanisms allow long-range dependency modeling.", "paper_id": "p3", "chunk_index": 0}
    ]
    query = "attention mechanism transformers"
    results = perform_bm25_search(query=query, corpus_chunks=corpus, top_k=2)

    assert len(results) <= 2
    assert any("attention" in r["text"].lower() for r in results)
    assert results[0]["bm25_score"] > 0

def test_reciprocal_rank_fusion():
    vector_results = [
        {"paper_id": "p1", "chunk_index": 0, "similarity_score": 0.9, "text": "Doc 1"},
        {"paper_id": "p2", "chunk_index": 0, "similarity_score": 0.8, "text": "Doc 2"}
    ]
    bm25_results = [
        {"paper_id": "p2", "chunk_index": 0, "bm25_score": 5.4, "text": "Doc 2"},
        {"paper_id": "p3", "chunk_index": 0, "bm25_score": 3.2, "text": "Doc 3"}
    ]

    fused = reciprocal_rank_fusion(vector_results, bm25_results, top_k=3)
    assert len(fused) == 3
    # Doc 2 is present in both vector and bm25, so it should rank highest after RRF fusion
    assert fused[0]["paper_id"] == "p2"
    assert fused[0]["retrieval_method"] == "hybrid_bm25_vector"
