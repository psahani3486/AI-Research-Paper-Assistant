from fastapi import APIRouter

router = APIRouter(prefix="/comparison", tags=["Comparison"])

@router.get("/")
def comparison_health():
    """
    Placeholder endpoint for paper comparison operations.
    Full implementation in later stages.
    """
    return {"message": "Comparison API initialized"}
