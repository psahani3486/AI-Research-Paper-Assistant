"""
Unit Tests for Recursive Sliding Window Chunker
"""
import pytest
from app.services.chunking_service import split_text_into_chunks, chunk_paper_pages

def test_split_text_into_chunks_small_text():
    text = "Short text example for unit test."
    chunks = split_text_into_chunks(text, chunk_size=800, chunk_overlap=150)
    assert len(chunks) == 1
    assert chunks[0]["text"] == text

def test_split_text_into_chunks_long_text():
    long_text = "Word " * 500  # ~2500 chars
    chunks = split_text_into_chunks(long_text, chunk_size=800, chunk_overlap=150)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk["text"]) <= 1000

def test_chunk_paper_pages():
    pages = [
        {"page_number": 1, "text": "Page 1 intro content about Transformers and Attention mechanisms."},
        {"page_number": 2, "text": "Page 2 methodology content describing vector embeddings and similarity search."}
    ]
    paper_id = "test_paper_123"
    result = chunk_paper_pages(paper_id=paper_id, pages_data=pages)

    assert len(result) >= 2
    assert result[0]["paper_id"] == paper_id
    assert result[0]["page_number"] == 1
    assert "chunk_index" in result[0]
