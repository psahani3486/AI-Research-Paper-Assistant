"""
Parent-Child Document Chunking & Retrieval Service
Indexes small child chunks (high-precision vector retrieval) linked to larger parent context blocks (fed to LLM).
"""
from typing import List, Dict, Tuple

def create_parent_child_chunks(
    paper_id: str,
    page_number: int,
    page_text: str,
    parent_size: int = 1000,
    child_size: int = 250
) -> Tuple[List[Dict], List[Dict]]:
    """
    Splits page text into Parent chunks (~1000 chars) and Child chunks (~250 chars) linked by parent_id.
    
    Returns:
        Tuple[parents_list, children_list]
    """
    if not page_text:
        return [], []

    parents = []
    children = []

    parent_idx = 0
    child_global_idx = 0

    for i in range(0, len(page_text), parent_size):
        parent_text = page_text[i:i + parent_size].strip()
        if not parent_text:
            continue

        parent_id = f"{paper_id}_p{page_number}_parent_{parent_idx}"
        parents.append({
            "parent_id": parent_id,
            "paper_id": paper_id,
            "page_number": page_number,
            "text": parent_text
        })

        # Generate child chunks inside this parent text
        for j in range(0, len(parent_text), child_size):
            child_text = parent_text[j:j + child_size].strip()
            if not child_text:
                continue

            child_id = f"{paper_id}_p{page_number}_child_{child_global_idx}"
            children.append({
                "child_id": child_id,
                "parent_id": parent_id,
                "paper_id": paper_id,
                "page_number": page_number,
                "chunk_index": child_global_idx,
                "text": child_text
            })
            child_global_idx += 1

        parent_idx += 1

    return parents, children
