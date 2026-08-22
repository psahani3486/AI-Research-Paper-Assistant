"""
Enterprise Chat & Streaming RAG API Router
Provides SSE real-time token streaming and multi-turn conversational endpoints.
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from app.schemas.paper_schema import RAGQueryRequest, ChatRequest, RAGQueryResponse, ChatThreadResponse
from app.services.llm_service import generate_grounded_answer, stream_rag_completion, generate_conversational_rag_answer
from app.logger import logger

router = APIRouter(prefix="/chat", tags=["Chat & Streaming RAG"])

@router.post("/query", response_model=RAGQueryResponse)
def run_rag_query(request: RAGQueryRequest):
    """
    Executes single-turn Grounded RAG query using Hybrid BM25 + Vector Search and Groq LLM synthesis.
    """
    try:
        result = generate_grounded_answer(
            query=request.query,
            top_k=request.top_k or 3,
            paper_id=request.paper_id
        )
        return result
    except Exception as e:
        logger.error(f"Error in RAG Query API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/stream")
async def stream_rag_query(request: RAGQueryRequest):
    """
    Executes real-time SSE token-by-token streaming RAG query.
    Returns event-stream (text/event-stream) with metadata and live tokens.
    """
    try:
        return StreamingResponse(
            stream_rag_completion(
                query=request.query,
                paper_id=request.paper_id,
                top_k=request.top_k or 3
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        logger.error(f"Error starting RAG stream: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/conversation", response_model=ChatThreadResponse)
def run_conversational_chat(request: ChatRequest):
    """
    Executes multi-turn conversational RAG query for a specific research paper.
    """
    try:
        result = generate_conversational_rag_answer(
            paper_id=request.paper_id,
            user_message=request.message,
            top_k=request.top_k or 3
        )
        return result
    except Exception as e:
        logger.error(f"Error in Conversational Chat API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
