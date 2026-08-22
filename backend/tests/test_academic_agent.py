"""
Unit & Integration Tests for Academic Agent & Export Services
"""
import pytest
from app.services.parent_child_service import create_parent_child_chunks
from app.services.reranker_service import compute_semantic_relevance_score, rerank_candidates
from app.services.export_service import export_to_latex, export_to_bibtex, export_to_markdown, export_to_json

def test_create_parent_child_chunks():
    text = "Short introductory paragraph. " * 30  # ~900 chars
    parents, children = create_parent_child_chunks(
        paper_id="paper_1",
        page_number=1,
        page_text=text,
        parent_size=500,
        child_size=150
    )
    assert len(parents) >= 1
    assert len(children) >= len(parents)
    assert children[0]["parent_id"] == parents[0]["parent_id"]

def test_compute_semantic_relevance_score():
    query = "Transformer Attention Mechanism"
    text = "The Transformer architecture relies heavily on multi-head self-attention mechanisms."
    score = compute_semantic_relevance_score(query, text)
    assert score > 0.5

def test_rerank_candidates():
    candidates = [
        {"paper_id": "p1", "chunk_index": 0, "similarity_score": 0.9, "text": "Unrelated topic text about database indexing."},
        {"paper_id": "p2", "chunk_index": 0, "similarity_score": 0.8, "text": "Transformer Attention mechanisms are key for NLP models."}
    ]
    query = "Transformer Attention"
    reranked = rerank_candidates(query, candidates, top_k=2)

    assert len(reranked) == 2
    # The second chunk matches query terms strongly, so cross-encoder composite score ranks it highest
    assert reranked[0]["paper_id"] == "p2"

def test_export_to_latex():
    markdown = "# Abstract\nThis is an academic abstract.\n## Methodology\nWe use PyTorch."
    latex = export_to_latex(title="Test Paper", content_markdown=markdown)
    assert "\\documentclass{article}" in latex
    assert "\\section{Abstract}" in latex

def test_export_to_bibtex():
    papers = [{"title": "Attention Is All You Need", "pages": 12}]
    bib = export_to_bibtex(papers)
    assert "@article{" in bib
    assert "Attention Is All You Need" in bib

def test_export_to_json():
    data = {"title": "Test", "score": 0.95}
    json_str = export_to_json(data)
    assert '"title": "Test"' in json_str
