"""
RAG Pipeline Assembly & Anti-Hallucination Grounded Prompting Service
Orchestrates Hybrid (BM25 + Vector Search) retrieval, formats structured context blocks,
and enforces anti-hallucination prompt guardrails for grounded academic generation.
"""
import time
from typing import List, Dict, Optional, Tuple
from app.services.hybrid_retrieval_service import perform_hybrid_search
from app.logger import logger

ANTI_HALLUCINATION_SYSTEM_PROMPT = """You are an expert academic AI Research Assistant.
Your primary task is to answer user questions using ONLY the provided research paper context blocks below.

STRICT GROUNDING & ANTI-HALLUCINATION RULES:
1. STRICT CONTEXT BOUNDARY: Rely EXCLUSIVELY on the facts provided in the <context> blocks below. Do NOT use outside knowledge or extrapolate beyond the text.
2. ZERO HALLUCINATION FALLBACK: If the provided context does NOT contain sufficient information to answer the question, state EXACTLY:
   "I cannot find sufficient information in the provided research paper(s) to answer this question."
3. MANDATORY INLINE CITATIONS: Every claim, fact, dataset name, or result mentioned in your response MUST include an inline source citation in the format: [Paper Name, Page X] (e.g., [Attention Is All You Need, Page 4]).
4. ACADEMIC TONE: Maintain an objective, clear, academic, and professional tone in all responses.
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
        return "<context>\nNo relevant context chunks found in database.\n</context>", []

    context_lines = ["<context>"]
    sources_list = []

    for idx, chunk in enumerate(retrieved_chunks, start=1):
        paper_name = chunk.get("paper_name", "Research Paper")
        page_num = chunk.get("page_number", 1)
        chunk_idx = chunk.get("chunk_index", 0)
        sim_score = chunk.get("similarity_score", chunk.get("vector_score", 0.0))
        sim_pct = chunk.get("similarity_percentage", round(sim_score * 100, 1))
        bm25_score = chunk.get("bm25_score", 0.0)
        rrf_score = chunk.get("rrf_score", 0.0)
        text = chunk.get("text", "")

        header = f"[Source {idx} | Paper: '{paper_name}' | Page: {page_num} | Chunk: #{chunk_idx} | Match: {sim_pct}% | BM25: {bm25_score} | RRF: {rrf_score}]"
        context_lines.append(f"{header}\n{text}\n")

        sources_list.append({
            "paper_name": paper_name,
            "page_number": page_num,
            "chunk_index": chunk_idx,
            "similarity_score": sim_score,
            "similarity_percentage": sim_pct,
            "bm25_score": bm25_score,
            "rrf_score": rrf_score,
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
    Enterprise RAG Pipeline Assembly:
    1. Executes Hybrid (BM25 + Vector + RRF) retrieval
    2. Builds anti-hallucination system prompt
    3. Formats retrieved chunks into XML context blocks with citations
    4. Assembles user prompt: Query + Context
    5. Measures retrieval latency and attaches RAG observability metrics
    """
    start_time = time.time()

    # 1. Execute Hybrid Search
    retrieved_chunks = perform_hybrid_search(query_text=query, top_k=top_k, paper_id=paper_id)
    retrieval_latency_ms = round((time.time() - start_time) * 1000, 2)

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
        "sources": sources,
        "telemetry": {
            "retrieval_strategy": "Hybrid BM25 + Vector Search (RRF)",
            "retrieval_latency_ms": retrieval_latency_ms,
            "candidates_evaluated": len(retrieved_chunks)
        }
    }
