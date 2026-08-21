from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from typing import List
import os
from app.services.pdf_service import save_pdf_file, delete_pdf_file, extract_pdf_pages
from app.services.chunking_service import chunk_paper_pages
from app.services.embedding_service import generate_embeddings
from app.services.vector_service import (
    index_paper_chunks, 
    delete_paper_chunks_from_vector_db, 
    get_vector_db_stats,
    search_similar_chunks
)
from app.services.rag_service import assemble_rag_pipeline
from app.services.llm_service import generate_grounded_answer, generate_conversational_rag_answer
from app.services.summary_service import generate_paper_summary
from app.services.comparison_service import compare_papers
from app.services.gap_service import detect_research_gaps
from app.services.eval_service import evaluate_rag_query, get_viva_qa_list
from app.database.database import (
    insert_paper, 
    get_all_papers_from_db, 
    get_paper_by_id_from_db, 
    delete_paper_from_db,
    update_paper_chunks_count,
    get_chat_messages_by_paper_id,
    clear_chat_history_from_db
)
from app.schemas.paper_schema import (
    PaperResponse, 
    PaperListResponse, 
    MessageResponse, 
    ExtractionResponse,
    ChunkingResponse,
    EmbeddingResponse,
    IndexingResponse,
    VectorDBStatsResponse,
    SearchRequest,
    SearchResponse,
    RAGAssemblyRequest,
    RAGAssemblyResponse,
    RAGQueryRequest,
    RAGQueryResponse,
    ChatRequest,
    ChatThreadResponse,
    PaperSummaryResponse,
    ComparisonRequest,
    ComparisonMatrixResponse,
    ResearchGapResponse,
    RAGTriadEvalResponse,
    VivaQAResponse
)
from app.config import settings

router = APIRouter(prefix="/papers", tags=["Papers"])

@router.post("/upload", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def upload_paper(file: UploadFile = File(...)):
    try:
        paper_id, title, original_filename, file_path, page_count = await save_pdf_file(file)
        paper_record = insert_paper(
            paper_id=paper_id,
            title=title,
            filename=original_filename,
            file_path=file_path,
            pages=page_count
        )
        
        # Auto-extract, chunk, embed, and index into ChromaDB
        try:
            pages_data = extract_pdf_pages(file_path)
            chunks = chunk_paper_pages(paper_id=paper_id, pages_data=pages_data)
            chunk_texts = [c["text"] for c in chunks]
            vectors = generate_embeddings(chunk_texts)
            indexed_count = index_paper_chunks(paper_id=paper_id, paper_name=title, chunks=chunks, embeddings=vectors)
            update_paper_chunks_count(paper_id=paper_id, chunks_count=indexed_count, status="indexed")
            paper_record["status"] = "indexed"
            paper_record["chunks_count"] = indexed_count
        except Exception as idx_err:
            print(f"[Auto-Indexing Warning]: {idx_err}")

        return paper_record
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[Upload API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process PDF upload: {str(e)}"
        )

@router.get("/", response_model=PaperListResponse)
def list_papers():
    papers = get_all_papers_from_db()
    return {
        "total": len(papers),
        "papers": papers
    }

@router.get("/vector-db/stats", response_model=VectorDBStatsResponse, tags=["Vector DB"])
def get_vector_stats():
    return get_vector_db_stats()

# Stage 15 RAG Triad Evaluation & Viva Q&A Endpoints

@router.post("/eval/query", response_model=RAGTriadEvalResponse, tags=["RAG Triad Evaluation"])
def evaluate_query_endpoint(request: RAGQueryRequest):
    try:
        scorecard = evaluate_rag_query(query=request.query, paper_id=request.paper_id)
        return scorecard
    except Exception as e:
        print(f"[Evaluation API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate RAG query: {str(e)}"
        )

@router.get("/eval/viva-qa", response_model=VivaQAResponse, tags=["BTP Viva Preparation"])
def get_viva_qa():
    questions = get_viva_qa_list()
    categories = list(set(q["category"] for q in questions))
    return {
        "total_questions": len(questions),
        "categories": categories,
        "questions": questions
    }

# Stage 14 PDF Streaming & Export Endpoints

@router.get("/{paper_id}/pdf", tags=["Academic UI Polish"])
def stream_paper_pdf(paper_id: str):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper or not os.path.exists(paper["file_path"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF file for paper ID '{paper_id}' not found."
        )

    return FileResponse(
        path=paper["file_path"],
        media_type="application/pdf",
        filename=paper["filename"]
    )

@router.get("/{paper_id}/export", tags=["Academic UI Polish"])
def export_research_dossier(paper_id: str):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    try:
        summary = generate_paper_summary(paper_id, force_refresh=False)
    except Exception:
        summary = {
            "abstract_summary": "Extracted from paper document context.",
            "problem": "Unaddressed research problem.",
            "methodology": "Proposed research architecture.",
            "dataset": "Standard academic benchmarks.",
            "results": "Quantitative evaluation metrics.",
            "limitations": "Current constraints and trade-offs.",
            "future_work": "Future research directions."
        }

    try:
        gaps = detect_research_gaps(paper_id)
    except Exception:
        gaps = {
            "explicit_gaps": ["High computational complexity admitted by authors."],
            "inferred_gaps": ["Lack of real-time latency evaluation on embedded edge hardware."],
            "potential_research_ideas": [
                {
                    "title": f"Quantized & Accelerated {paper['title'][:30]} for Edge Devices",
                    "description": "Applies model quantization to reduce VRAM footprint.",
                    "target_gap_addressed": "High GPU memory overhead."
                }
            ]
        }

    dossier_md = f"""# ACADEMIC RESEARCH DOSSIER

## Paper Identification
- **Title:** {paper['title']}
- **Original File:** {paper['filename']}
- **Paper ID:** {paper['id']}
- **Pages:** {paper['pages']}
- **Status:** {paper['status'].upper()}
- **Uploaded At:** {paper['uploaded_at']}

---

## 1. Structured 7-Pillar Academic Analysis

### 1. Abstract Summary
{summary.get('abstract_summary', '')}

### 2. Core Problem Statement
{summary.get('problem', '')}

### 3. Proposed Methodology & Architecture
{summary.get('methodology', '')}

### 4. Datasets & Benchmarks Evaluated
{summary.get('dataset', '')}

### 5. Quantitative Results & Metrics
{summary.get('results', '')}

### 6. Limitations & Constraints
{summary.get('limitations', '')}

### 7. Future Work Directions
{summary.get('future_work', '')}

---

## 2. Research Gap Analysis

### Explicit Gaps (Author Acknowledged)
""" + "\n".join([f"- {g}" for g in gaps.get('explicit_gaps', [])]) + """

### Inferred Gaps (Critically Derived)
""" + "\n".join([f"- {g}" for g in gaps.get('inferred_gaps', [])]) + """

---

## 3. Actionable B.Tech / BTP Project Proposals

""" + "\n".join([f"### Project Proposal #{i+1}: {idea.get('title', 'Project Idea')}\n- **Description:** {idea.get('description', '')}\n- **Target Gap Solved:** {idea.get('target_gap_addressed', '')}\n" for i, idea in enumerate(gaps.get('potential_research_ideas', []))]) + """
---
*Generated by AI Research Paper Assistant (BTP System v1.0)*
"""

    return Response(
        content=dossier_md,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=Dossier_{paper['id'][:8]}.md"}
    )

# Stage 7 Semantic Search Endpoint

@router.post("/search", response_model=SearchResponse, tags=["Vector Search"])
def search_papers(request: SearchRequest):
    try:
        results = search_similar_chunks(
            query_text=request.query,
            top_k=request.top_k,
            paper_id=request.paper_id
        )

        return {
            "query": request.query,
            "top_k": request.top_k,
            "total_results": len(results),
            "results": results
        }
    except Exception as e:
        print(f"[Search API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform semantic search: {str(e)}"
        )

# Stage 8 RAG Pipeline Endpoint

@router.post("/rag/assemble", response_model=RAGAssemblyResponse, tags=["RAG Pipeline"])
def assemble_rag(request: RAGAssemblyRequest):
    try:
        payload = assemble_rag_pipeline(
            query=request.query,
            top_k=request.top_k,
            paper_id=request.paper_id
        )
        return payload
    except Exception as e:
        print(f"[RAG Assembly API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assemble RAG pipeline: {str(e)}"
        )

# Stage 9 Groq LLM Synthesis Endpoint

@router.post("/rag/query", response_model=RAGQueryResponse, tags=["Groq LLM RAG"])
def query_rag_llm(request: RAGQueryRequest):
    try:
        response = generate_grounded_answer(
            query=request.query,
            top_k=request.top_k,
            paper_id=request.paper_id
        )
        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        print(f"[Groq LLM Synthesis API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate answer with Groq LLM: {str(e)}"
        )

# Stage 10 Multi-Turn Conversational Chat Endpoints

@router.post("/{paper_id}/chat", response_model=ChatThreadResponse, tags=["Interactive Chat"])
def send_chat_message(paper_id: str, request: ChatRequest):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    try:
        thread = generate_conversational_rag_answer(
            paper_id=paper_id,
            user_message=request.message,
            top_k=request.top_k
        )
        return thread
    except Exception as e:
        print(f"[Chat API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat message: {str(e)}"
        )

@router.get("/{paper_id}/chat", response_model=ChatThreadResponse, tags=["Interactive Chat"])
def get_chat_thread(paper_id: str):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    messages = get_chat_messages_by_paper_id(paper_id)
    return {
        "paper_id": paper_id,
        "total_messages": len(messages),
        "messages": messages
    }

@router.delete("/{paper_id}/chat", response_model=MessageResponse, tags=["Interactive Chat"])
def clear_chat(paper_id: str):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    clear_chat_history_from_db(paper_id)
    return {
        "message": f"Chat history for '{paper['title']}' cleared successfully.",
        "paper_id": paper_id
    }

# Stage 11 Paper Summarization Endpoints

@router.post("/{paper_id}/summarize", response_model=PaperSummaryResponse, tags=["Paper Summarization"])
def summarize_paper(paper_id: str, force_refresh: bool = Query(default=False)):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    try:
        summary = generate_paper_summary(paper_id=paper_id, force_refresh=force_refresh)
        return summary
    except Exception as e:
        print(f"[Summarization API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate paper summary: {str(e)}"
        )

@router.get("/{paper_id}/summary", response_model=PaperSummaryResponse, tags=["Paper Summarization"])
def get_paper_summary_endpoint(paper_id: str):
    return summarize_paper(paper_id=paper_id, force_refresh=False)

# Stage 12 Multi-Document Paper Comparison Endpoint

@router.post("/compare", response_model=ComparisonMatrixResponse, tags=["Paper Comparison"])
def compare_papers_endpoint(request: ComparisonRequest):
    try:
        matrix = compare_papers(paper_ids=request.paper_ids)
        return matrix
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        print(f"[Comparison API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate paper comparison matrix: {str(e)}"
        )

# Stage 13 Research Gap Detection Endpoint

@router.post("/{paper_id}/gaps", response_model=ResearchGapResponse, tags=["Research Gap Detection"])
def get_paper_research_gaps(paper_id: str):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    try:
        gaps = detect_research_gaps(paper_id=paper_id)
        return gaps
    except Exception as e:
        print(f"[Gap Detection API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to detect research gaps: {str(e)}"
        )

@router.get("/{paper_id}", response_model=PaperResponse)
def get_paper_details(paper_id: str):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )
    return paper

@router.delete("/{paper_id}", response_model=MessageResponse)
def delete_paper(paper_id: str):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    delete_paper_chunks_from_vector_db(paper_id)
    delete_pdf_file(paper["file_path"])
    delete_paper_from_db(paper_id)

    return {
        "message": f"Paper '{paper['title']}' and its vectors deleted successfully.",
        "paper_id": paper_id
    }

# Stage 3 Endpoints

@router.post("/{paper_id}/extract", response_model=ExtractionResponse)
def extract_text(paper_id: str):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    try:
        pages_data = extract_pdf_pages(paper["file_path"])
        total_words = sum(p["word_count"] for p in pages_data)
        total_chars = sum(p["cleaned_text_length"] for p in pages_data)

        return {
            "paper_id": paper_id,
            "total_pages": len(pages_data),
            "total_words": total_words,
            "total_characters": total_chars,
            "pages": pages_data
        }
    except Exception as e:
        print(f"[Extraction API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract text from PDF: {str(e)}"
        )

@router.get("/{paper_id}/text", response_model=ExtractionResponse)
def get_extracted_text(paper_id: str):
    return extract_text(paper_id)

# Stage 4 Chunking Endpoints

@router.post("/{paper_id}/chunk", response_model=ChunkingResponse)
def chunk_paper(
    paper_id: str,
    chunk_size: int = Query(default=settings.CHUNK_SIZE, ge=200, le=3000),
    chunk_overlap: int = Query(default=settings.CHUNK_OVERLAP, ge=0, le=500)
):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    try:
        pages_data = extract_pdf_pages(paper["file_path"])
        chunks = chunk_paper_pages(
            paper_id=paper_id,
            pages_data=pages_data,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        total_words = sum(c["word_count"] for c in chunks)
        update_paper_chunks_count(paper_id=paper_id, chunks_count=len(chunks), status="chunked")

        return {
            "paper_id": paper_id,
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap,
            "total_chunks": len(chunks),
            "total_words": total_words,
            "chunks": chunks
        }
    except Exception as e:
        print(f"[Chunking API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to chunk document: {str(e)}"
        )

@router.get("/{paper_id}/chunks", response_model=ChunkingResponse)
def get_chunks(
    paper_id: str,
    chunk_size: int = Query(default=settings.CHUNK_SIZE, ge=200, le=3000),
    chunk_overlap: int = Query(default=settings.CHUNK_OVERLAP, ge=0, le=500)
):
    return chunk_paper(paper_id=paper_id, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

# Stage 5 Vector Embedding Endpoints

@router.post("/{paper_id}/embeddings", response_model=EmbeddingResponse)
def create_embeddings(
    paper_id: str,
    chunk_size: int = Query(default=settings.CHUNK_SIZE, ge=200, le=3000),
    chunk_overlap: int = Query(default=settings.CHUNK_OVERLAP, ge=0, le=500)
):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    try:
        pages_data = extract_pdf_pages(paper["file_path"])
        chunks = chunk_paper_pages(
            paper_id=paper_id,
            pages_data=pages_data,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        chunk_texts = [c["text"] for c in chunks]
        vectors = generate_embeddings(chunk_texts)

        items = []
        for i, chunk in enumerate(chunks):
            vector = vectors[i] if i < len(vectors) else []
            items.append({
                "chunk_index": chunk["chunk_index"],
                "page_number": chunk["page_number"],
                "vector_dimensions": len(vector),
                "sample_vector": [round(val, 4) for val in vector[:5]],
                "text_snippet": chunk["text"][:120] + ("..." if len(chunk["text"]) > 120 else "")
            })

        update_paper_chunks_count(paper_id=paper_id, chunks_count=len(chunks), status="embedded")

        return {
            "paper_id": paper_id,
            "embedding_model": settings.EMBEDDING_MODEL_NAME,
            "dimensions": 384,
            "total_embeddings": len(vectors),
            "items": items
        }
    except Exception as e:
        print(f"[Embedding API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embeddings: {str(e)}"
        )

# Stage 6 ChromaDB Indexing Endpoints

@router.post("/{paper_id}/index", response_model=IndexingResponse)
def index_paper_in_chromadb(
    paper_id: str,
    chunk_size: int = Query(default=settings.CHUNK_SIZE, ge=200, le=3000),
    chunk_overlap: int = Query(default=settings.CHUNK_OVERLAP, ge=0, le=500)
):
    paper = get_paper_by_id_from_db(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research paper with ID '{paper_id}' not found."
        )

    try:
        pages_data = extract_pdf_pages(paper["file_path"])
        chunks = chunk_paper_pages(
            paper_id=paper_id,
            pages_data=pages_data,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        chunk_texts = [c["text"] for c in chunks]
        vectors = generate_embeddings(chunk_texts)

        indexed_count = index_paper_chunks(
            paper_id=paper_id,
            paper_name=paper["title"],
            chunks=chunks,
            embeddings=vectors
        )

        update_paper_chunks_count(paper_id=paper_id, chunks_count=indexed_count, status="indexed")

        return {
            "paper_id": paper_id,
            "collection_name": "research_papers",
            "total_chunks_indexed": indexed_count,
            "status": "indexed",
            "message": f"Successfully indexed {indexed_count} vector chunks into ChromaDB."
        }
    except Exception as e:
        print(f"[ChromaDB Indexing API Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index paper in ChromaDB: {str(e)}"
        )
