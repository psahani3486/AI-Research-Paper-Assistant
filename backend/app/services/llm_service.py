"""
LLM Synthesis Service
Handles single-turn RAG answer generation and multi-turn conversational RAG.
Includes retry logic for Groq API rate limits.
"""
import time
from typing import Dict, Optional, List
from groq import Groq
from app.config import settings
from app.services.rag_service import assemble_rag_pipeline, build_anti_hallucination_system_prompt, construct_context_block
from app.services.vector_service import search_similar_chunks
from app.database.database import (
    insert_chat_message, 
    get_chat_messages_by_paper_id, 
    clear_chat_history_from_db
)

_GROQ_CLIENT: Groq = None

def get_groq_client() -> Groq:
    """Singleton loader for Groq SDK Client."""
    global _GROQ_CLIENT
    if _GROQ_CLIENT is None:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured in .env file.")
        print(f"[LLM Service] Initializing Groq client (model: {settings.GROQ_MODEL})...")
        _GROQ_CLIENT = Groq(api_key=settings.GROQ_API_KEY)
    return _GROQ_CLIENT


def _call_groq_with_retry(messages: list, max_tokens: int = 1024, temperature: float = 0.2, max_retries: int = 3) -> object:
    """
    Calls Groq API with exponential backoff retry on 429 rate-limit errors.
    Returns the API response object on success.
    Raises on non-retryable errors or after all retries are exhausted.
    """
    client = get_groq_client()
    model_name = settings.GROQ_MODEL or "groq/compound"

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response
        except Exception as e:
            error_str = str(e)
            # Retry on 429 rate limit or 413 too large
            if "429" in error_str or "rate_limit" in error_str.lower():
                wait_time = (2 ** attempt) * 5  # 5s, 10s, 20s
                print(f"[LLM Service] Rate limited (attempt {attempt + 1}/{max_retries}). Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            elif "413" in error_str or "too_large" in error_str.lower() or "request_too_large" in error_str.lower():
                # Reduce max_tokens and retry with shorter context
                print(f"[LLM Service] Request too large. Reducing max_tokens and retrying...")
                max_tokens = max(256, max_tokens // 2)
                # Trim messages content
                for msg in messages:
                    if msg["role"] == "user" and len(msg["content"]) > 800:
                        msg["content"] = msg["content"][:800] + "\n\n[Context truncated for size limits]"
                    elif msg["role"] == "system" and len(msg["content"]) > 1500:
                        msg["content"] = msg["content"][:1500] + "\n\n[System prompt truncated]"
                continue
            else:
                raise

    raise Exception(f"Groq API rate limit exceeded after {max_retries} retries. Please wait a few minutes and try again.")


def generate_grounded_answer(
    query: str, 
    top_k: int = 3, 
    paper_id: Optional[str] = None
) -> Dict:
    """
    Single-Turn RAG Synthesis:
    1. Assembles RAG context from ChromaDB
    2. Executes LLM inference with retry/backoff
    3. Returns grounded answer, latency_ms, token stats, and sources
    """
    rag_payload = assemble_rag_pipeline(query=query, top_k=top_k, paper_id=paper_id)
    system_prompt = rag_payload["system_prompt"]
    user_prompt = rag_payload["user_prompt"]
    sources = rag_payload["sources"]

    # Truncate prompts if they're too long to avoid 413
    if len(system_prompt) > 2000:
        system_prompt = system_prompt[:2000] + "\n\n[Truncated for token limits]"
    if len(user_prompt) > 2000:
        user_prompt = user_prompt[:2000] + "\n\n[Truncated for token limits]"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    t0 = time.time()
    response = _call_groq_with_retry(messages, max_tokens=1024, temperature=0.2)
    latency_ms = round((time.time() - t0) * 1000)

    choice = response.choices[0]
    answer_text = choice.message.content.strip()

    usage = response.usage
    prompt_tokens = usage.prompt_tokens if usage else 0
    completion_tokens = usage.completion_tokens if usage else 0
    total_tokens = usage.total_tokens if usage else 0

    return {
        "query": query,
        "answer": answer_text,
        "model": settings.GROQ_MODEL or "groq/compound",
        "latency_ms": latency_ms,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "sources": sources
    }

def generate_conversational_rag_answer(
    paper_id: str, 
    user_message: str, 
    top_k: int = 3
) -> Dict:
    """
    Multi-Turn Conversational RAG:
    1. Saves user message to SQLite
    2. Fetches past chat history
    3. Retrieves top-K vector chunks from ChromaDB
    4. Constructs multi-turn messages array
    5. Executes LLM inference with retry
    6. Saves assistant answer to SQLite
    7. Returns updated conversation thread
    """
    # 1. Save user message
    insert_chat_message(paper_id=paper_id, role="user", message=user_message)

    # 2. Fetch past chat history
    history = get_chat_messages_by_paper_id(paper_id=paper_id, limit=20)

    # 3. Retrieve relevant chunks
    retrieved_chunks = search_similar_chunks(query_text=user_message, top_k=top_k, paper_id=paper_id)
    context_text, sources = construct_context_block(retrieved_chunks)

    # 4. Construct messages
    system_prompt = build_anti_hallucination_system_prompt()
    # Truncate context if too long
    if len(context_text) > 1500:
        context_text = context_text[:1500] + "\n\n[Context truncated]"
    system_content = f"{system_prompt}\n\nGROUNDED CONTEXT:\n{context_text}"

    messages_payload = [{"role": "system", "content": system_content}]

    # Append past conversation (last 6 turns for efficiency)
    recent_history = history[:-1][-6:]
    for msg in recent_history:
        if msg["role"] in ["user", "assistant"]:
            content = msg["message"]
            if len(content) > 500:
                content = content[:500] + "..."
            messages_payload.append({
                "role": msg["role"],
                "content": content
            })

    # Append current user message
    messages_payload.append({
        "role": "user",
        "content": f"{user_message}\n\nAnswer using the provided context and cite sources as [Paper Name, Page X]."
    })

    # 5. Call LLM with retry
    response = _call_groq_with_retry(messages_payload, max_tokens=1024, temperature=0.2)
    assistant_answer = response.choices[0].message.content.strip()

    # 6. Save assistant message
    insert_chat_message(
        paper_id=paper_id, 
        role="assistant", 
        message=assistant_answer, 
        sources_list=sources
    )

    # 7. Return updated thread
    updated_history = get_chat_messages_by_paper_id(paper_id=paper_id)

    return {
        "paper_id": paper_id,
        "total_messages": len(updated_history),
        "messages": updated_history
    }
