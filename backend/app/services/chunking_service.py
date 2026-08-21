"""
Document Chunking Service
Responsible for splitting large extracted research paper text into manageable, overlapping chunks.
Preserves page metadata for exact source citations in RAG.
"""
from typing import List, Dict

SEPARATORS = ["\n\n", ".\n", ". ", "\n", " "]

def split_text_into_chunks(
    text: str, 
    chunk_size: int = 800, 
    chunk_overlap: int = 150
) -> List[Dict]:
    """
    Sliding Window Recursive Chunker:
    1. Iterates through text with step size = (chunk_size - chunk_overlap)
    2. Finds nearest clean boundary (sentence end or space) to avoid cutting words in half
    3. Yields list of chunk dicts: {"start": int, "end": int, "text": str}
    """
    if not text or len(text) == 0:
        return []

    if len(text) <= chunk_size:
        return [{"start": 0, "end": len(text), "text": text.strip()}]

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(start + chunk_size, text_length)

        # If we are not at the end of the text, try to find a natural boundary near 'end'
        if end < text_length:
            boundary_found = False
            # Search backwards up to 100 characters for a clean separator
            lookback_limit = max(start, end - 100)
            for sep in SEPARATORS:
                pos = text.rfind(sep, lookback_limit, end)
                if pos != -1 and pos > start:
                    end = pos + len(sep)
                    boundary_found = True
                    break

        chunk_str = text[start:end].strip()
        if chunk_str:
            chunks.append({
                "start": start,
                "end": end,
                "text": chunk_str
            })

        # Slide start index forward by (chunk_size - chunk_overlap)
        step = max(1, chunk_size - chunk_overlap)
        start += step

        # Prevent infinite loop if start didn't move past previous chunk end
        if len(chunks) > 0 and start <= chunks[-1]["start"]:
            start = chunks[-1]["end"]

    return chunks

def chunk_paper_pages(
    paper_id: str, 
    pages_data: List[Dict], 
    chunk_size: int = 800, 
    chunk_overlap: int = 150
) -> List[Dict]:
    """
    Processes extracted paper pages and generates page-aware chunks.

    Returns:
        [
          {
            "chunk_index": 0,
            "paper_id": "...",
            "page_number": 1,
            "start_char": 0,
            "end_char": 795,
            "char_count": 795,
            "word_count": 120,
            "text": "..."
          },
          ...
        ]
    """
    all_chunks = []
    global_chunk_idx = 0

    for page in pages_data:
        page_num = page["page_number"]
        page_text = page["text"]

        if not page_text or len(page_text.strip()) == 0:
            continue

        raw_chunks = split_text_into_chunks(page_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        for c in raw_chunks:
            chunk_text = c["text"]
            words = chunk_text.split()

            all_chunks.append({
                "chunk_index": global_chunk_idx,
                "paper_id": paper_id,
                "page_number": page_num,
                "start_char": c["start"],
                "end_char": c["end"],
                "char_count": len(chunk_text),
                "word_count": len(words),
                "text": chunk_text
            })

            global_chunk_idx += 1

    return all_chunks
