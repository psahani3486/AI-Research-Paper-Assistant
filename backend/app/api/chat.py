from fastapi import APIRouter

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.get("/")
def chat_health():
    """
    Placeholder endpoint for chat/RAG operations.
    Full implementation in later stages.
    """
    return {"message": "Chat API initialized"}
