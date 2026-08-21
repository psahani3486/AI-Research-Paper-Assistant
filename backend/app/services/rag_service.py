"""
RAG Pipeline Assembly & Anti-Hallucination Grounded Prompting Service (Stage 8)
Orchestrates vector search retrieval, formats structured context blocks,
and enforces anti-hallucination prompt guardrails for grounded academic generation.
"""
from typing import List, Dict, Optional, Tuple
from app.services.vector_service import search_similar_chunks

ANTI_HALLUCINATION_SYSTEM_PROMPT = """You are an expert academic AI Research Assistant.
Your primary task is to answer user questions using ONLY the provided research paper context blocks below.

STRICT GROUNDING & ANTI-HALLUCINATION RULES:
1. STRICT CONTEXT BOUNDARY: Rely EXCLUSIVELY on the facts provided in the <context> blocks below. Do NOT use outside knowledge or extrapolate beyond the text.
2. ZERO HALLUCINATION FALLBACK: If the provided context does NOT contain sufficient information to answer the question, state EXACTLY:
   "I cannot find sufficient information in the provided research paper(s) to answer this question."
3. MANDATORY INLINE CITATIONS: Every claim, fact, dataset name, or result mentioned in your response MUST include an inline source citation in the format: [Paper Name, Page X] (e.g., [Attention Is All You Need, Page 4]).
4. ACADEMIC TONE: Maintain a objective, clear, academic, and professional tone in all responses.
5. NO ASSUMPTIONS: Never make unverified assumptions or speculate on unstated facts."""

def build_anti_hallucination_system_prompt() -> str:
    """
    Returns the strict anti-hallucination system prompt.
    """
    return ANTI_HALLUCINATION_SYSTEM_PROMPT

def construct_context_block(retrieved_chunks: List[Dict]) -> Tuple[str, List[Dict]]:
    """
    Formats retrieved vector search chunks into structured <context> XML tags with source metadata headers.

    Returns:
        Tuple[context_text_string, sources_metadata_list]
    """
    if not retrieved_chunks:
        return "<context>\nNo relevant context chunks found in ChromaDB.\n</context>", []

    context_lines = ["<context>"]
    sources_list = []

    for idx, chunk in enumerate(retrieved_chunks, start=1):
        paper_name = chunk.get("paper_name", "Research Paper")
        page_num = chunk.get("page_number", 1)
        chunk_idx = chunk.get("chunk_index", 0)
        sim_score = chunk.get("similarity_score", 0.0)
        sim_pct = chunk.get("similarity_percentage", 0.0)
        text = chunk.get("text", "")

        header = f"[Source {idx} | Paper: '{paper_name}' | Page: {page_num} | Chunk: #{chunk_idx} | Match: {sim_pct}%]"
        context_lines.append(f"{header}\n{text}\n")

        sources_list.append({
            "paper_name": paper_name,
            "page_number": page_num,
            "chunk_index": chunk_idx,
            "similarity_score": sim_score,
            "similarity_percentage": sim_pct,
            "text_snippet": text[:150] + ("..." if len(text) > 150 else "")
        })

    context_lines.append("</context>")
    context_text = "\n".join(context_lines)

    return context_text, sources_list

def assemble_rag_pipeline(
    query: str, 
    top_k: int = 3, 
    paper_id: Optional[str] = None
) -> Dict:
    """
    RAG Pipeline Assembly (Stage 8):
    1. Executes Stage 7 vector search retrieval against ChromaDB
    2. Builds anti-hallucination system prompt
    3. Formats retrieved chunks into XML context blocks with citations
    4. Assembles user prompt: Query + Context
    5. Returns complete payload ready for LLM consumption in Stage 9
    """
    # 1. Retrieve top-K relevant chunks from ChromaDB
    retrieved_chunks = search_similar_chunks(query_text=query, top_k=top_k, paper_id=paper_id)

    # 2. Format context block & sources
    context_text, sources = construct_context_block(retrieved_chunks)

    # 3. System & User prompts
    system_prompt = build_anti_hallucination_system_prompt()
    user_prompt = f"""Question: {query}

{context_text}

Instruction: Answer the question above based ONLY on the provided <context> above. Remember to include inline page citations like [Paper Name, Page X]."""

    return {
        "query": query,
        "top_k": top_k,
        "sources_count": len(sources),
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "context_window_text": context_text,
        "sources": sources
    }
