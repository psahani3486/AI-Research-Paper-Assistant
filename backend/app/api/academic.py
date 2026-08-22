"""
Enterprise Academic AI Agent & Export API Router
Provides endpoints for Literature Review generation, Audio Podcast Briefing scripts,
Proposal Critic evaluations, Multi-Format Exports (LaTeX, BibTeX, Markdown, JSON), and Workspaces.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from app.services.literature_review_service import generate_literature_review
from app.services.audio_briefing_service import generate_audio_briefing_script
from app.services.critic_service import critique_research_proposal
from app.services.export_service import export_to_latex, export_to_bibtex, export_to_markdown, export_to_json
from app.database.database import get_all_papers_from_db, update_paper_category
from app.logger import logger

router = APIRouter(prefix="/academic", tags=["Academic AI Agent & Tools"])

# Pydantic Schemas
class LiteratureReviewRequest(BaseModel):
    paper_ids: Optional[List[str]] = Field(default=[], description="List of paper_ids to synthesize")

class LiteratureReviewResponse(BaseModel):
    paper_count: int
    analyzed_papers: List[str]
    literature_review_markdown: str
    bibtex_citations: str
    latency_ms: float

class AudioBriefingResponse(BaseModel):
    paper_id: str
    paper_title: str
    total_turns: int
    script_turns: List[dict]
    latency_ms: float
    audio_format: str

class ProposalCriticRequest(BaseModel):
    proposal_title: str
    proposal_text: str
    target_paper_id: Optional[str] = None

class ProposalCriticResponse(BaseModel):
    proposal_title: str
    critique_markdown: str
    referenced_sources_count: int
    latency_ms: float

class ExportRequest(BaseModel):
    title: str
    content_markdown: str
    export_format: str = Field(default="latex", description="latex | bibtex | markdown | json")
    paper_ids: Optional[List[str]] = None

class ExportResponse(BaseModel):
    title: str
    export_format: str
    exported_content: str

class UpdateCategoryRequest(BaseModel):
    paper_id: str
    category: str

# API Endpoints

@router.post("/literature-review", response_model=LiteratureReviewResponse)
def synthesize_literature_review(request: LiteratureReviewRequest):
    """
    Synthesizes multiple uploaded papers into a publication-ready Academic Literature Review.
    """
    try:
        result = generate_literature_review(paper_ids=request.paper_ids or [])
        return result
    except Exception as e:
        logger.error(f"Error in Literature Review API: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/audio-briefing/{paper_id}", response_model=AudioBriefingResponse)
def get_audio_briefing(paper_id: str):
    """
    Generates a 2-minute NotebookLM-style AI Audio Podcast Briefing script.
    """
    try:
        result = generate_audio_briefing_script(paper_id=paper_id)
        return result
    except Exception as e:
        logger.error(f"Error in Audio Briefing API: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/proposal-critic", response_model=ProposalCriticResponse)
def run_proposal_critic(request: ProposalCriticRequest):
    """
    Evaluates a user research proposal/idea against indexed literature context.
    """
    try:
        result = critique_research_proposal(
            proposal_title=request.proposal_title,
            proposal_text=request.proposal_text,
            target_paper_id=request.target_paper_id
        )
        return result
    except Exception as e:
        logger.error(f"Error in Proposal Critic API: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/export", response_model=ExportResponse)
def export_academic_content(request: ExportRequest):
    """
    Converts markdown content into LaTeX (.tex), BibTeX (.bib), Markdown (.md), or JSON (.json).
    """
    try:
        fmt = request.export_format.lower()
        if fmt == "latex":
            content = export_to_latex(title=request.title, content_markdown=request.content_markdown)
        elif fmt == "bibtex":
            papers = get_all_papers_from_db()
            if request.paper_ids:
                papers = [p for p in papers if p["id"] in request.paper_ids]
            content = export_to_bibtex(papers=papers)
        elif fmt == "markdown":
            content = export_to_markdown(title=request.title, content=request.content_markdown)
        elif fmt == "json":
            content = export_to_json(data={"title": request.title, "content": request.content_markdown})
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported format: {fmt}")

        return {
            "title": request.title,
            "export_format": fmt,
            "exported_content": content
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in Export API: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/category")
def update_category(request: UpdateCategoryRequest):
    """
    Updates the domain workspace category of a paper (e.g. 'NLP', 'Computer Vision', 'Reinforcement Learning').
    """
    success = update_paper_category(paper_id=request.paper_id, category=request.category)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return {"message": "Category updated successfully", "paper_id": request.paper_id, "category": request.category}
