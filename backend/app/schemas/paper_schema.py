from pydantic import BaseModel, Field
from typing import List, Optional

class PaperBase(BaseModel):
    title: str
    filename: str
    pages: int = 0
    chunks_count: int = 0
    status: str = "uploaded"

class PaperCreate(PaperBase):
    id: str
    file_path: str

class PaperResponse(PaperBase):
    id: str
    file_path: str
    uploaded_at: str

    class Config:
        from_attributes = True

class PaperListResponse(BaseModel):
    total: int
    papers: List[PaperResponse]

class MessageResponse(BaseModel):
    message: str
    paper_id: Optional[str] = None

# Stage 3 Text Extraction Schemas
class PageTextSchema(BaseModel):
    page_number: int
    raw_text_length: int
    cleaned_text_length: int
    word_count: int
    text: str

class ExtractionResponse(BaseModel):
    paper_id: str
    total_pages: int
    total_words: int
    total_characters: int
    pages: List[PageTextSchema]

# Stage 4 Chunking Schemas
class ChunkSchema(BaseModel):
    chunk_index: int
    paper_id: str
    page_number: int
    start_char: int
    end_char: int
    char_count: int
    word_count: int
    text: str

class ChunkingResponse(BaseModel):
    paper_id: str
    chunk_size: int
    chunk_overlap: int
    total_chunks: int
    total_words: int
    chunks: List[ChunkSchema]

# Stage 5 Vector Embedding Schemas
class EmbeddingItemSchema(BaseModel):
    chunk_index: int
    page_number: int
    vector_dimensions: int
    sample_vector: List[float]
    text_snippet: str

class EmbeddingResponse(BaseModel):
    paper_id: str
    embedding_model: str
    dimensions: int
    total_embeddings: int
    items: List[EmbeddingItemSchema]

# Stage 6 ChromaDB Indexing Schemas
class IndexingResponse(BaseModel):
    paper_id: str
    collection_name: str
    total_chunks_indexed: int
    status: str
    message: str

class VectorDBStatsResponse(BaseModel):
    collection_name: str
    total_vectors: int
    persist_directory: str
    status: str

# Stage 7 Semantic Search Schemas
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Natural language search query")
    top_k: int = Field(default=3, ge=1, le=20, description="Number of top relevant chunks to retrieve")
    paper_id: Optional[str] = Field(default=None, description="Optional paper_id to filter search within a single paper")

class SearchResultItem(BaseModel):
    rank: int
    chunk_index: int
    page_number: int
    paper_id: str
    paper_name: str
    similarity_score: float
    similarity_percentage: float
    text: str

class SearchResponse(BaseModel):
    query: str
    top_k: int
    total_results: int
    results: List[SearchResultItem]

# Stage 8 RAG Pipeline Schemas
class RAGAssemblyRequest(BaseModel):
    query: str = Field(..., min_length=2, description="User question to answer using RAG")
    top_k: int = Field(default=3, ge=1, le=10, description="Top-K context chunks to retrieve from ChromaDB")
    paper_id: Optional[str] = Field(default=None, description="Optional paper_id to restrict RAG retrieval")

class RAGSourceSchema(BaseModel):
    paper_name: str
    page_number: int
    chunk_index: int
    similarity_score: float
    similarity_percentage: float
    text_snippet: str

class RAGAssemblyResponse(BaseModel):
    query: str
    top_k: int
    sources_count: int
    system_prompt: str
    user_prompt: str
    context_window_text: str
    sources: List[RAGSourceSchema]

# Stage 9 Groq LLM RAG Query Schemas
class RAGQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, description="User question to answer using Groq LLM")
    top_k: int = Field(default=3, ge=1, le=10, description="Top-K context chunks to retrieve")
    paper_id: Optional[str] = Field(default=None, description="Optional paper_id filter")

class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    model: str
    latency_ms: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    sources: List[RAGSourceSchema]

# Stage 10 Conversational Chat Schemas
class ChatMessageSchema(BaseModel):
    id: Optional[int] = None
    paper_id: str
    role: str
    message: str
    sources: Optional[List[RAGSourceSchema]] = None
    created_at: Optional[str] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Chat message text")
    top_k: int = Field(default=3, ge=1, le=10, description="Top-K vector chunks to retrieve for this turn")

class ChatThreadResponse(BaseModel):
    paper_id: str
    total_messages: int
    messages: List[ChatMessageSchema]

# Stage 11 Paper Summarization Schemas
class PaperSummaryResponse(BaseModel):
    paper_id: str
    abstract_summary: str
    problem: str
    methodology: str
    dataset: str
    results: str
    limitations: str
    future_work: str
    created_at: Optional[str] = None

# Stage 12 Paper Comparison Schemas
class ComparisonRequest(BaseModel):
    paper_ids: List[str] = Field(..., min_items=2, max_items=5, description="List of paper_ids to compare side-by-side")

class ComparisonItemSchema(BaseModel):
    paper_id: str
    title: str
    problem: str
    methodology: str
    dataset: str
    results: str
    strengths: str
    limitations: str

class ComparisonMatrixResponse(BaseModel):
    total_papers: int
    compared_papers: List[ComparisonItemSchema]
    comparative_summary: str

# Stage 13 Research Gap Schemas
class ProjectIdeaSchema(BaseModel):
    title: str
    description: str
    target_gap_addressed: str

class ResearchGapResponse(BaseModel):
    paper_id: str
    paper_title: str
    explicit_gaps: List[str]
    inferred_gaps: List[str]
    potential_research_ideas: List[ProjectIdeaSchema]

# Stage 15 Evaluation & Viva Schemas
class RAGTriadEvalResponse(BaseModel):
    query: str
    answer: str
    context_relevance_score: float
    groundedness_score: float
    answer_relevance_score: float
    overall_triad_score: float
    retrieved_chunks_count: int
    eval_summary: str
    sources: List[RAGSourceSchema]

class VivaQAItemSchema(BaseModel):
    id: int
    category: str
    question: str
    answer: str
    key_points: List[str]
    code_snippet: Optional[str] = None

class VivaQAResponse(BaseModel):
    total_questions: int
    categories: List[str]
    questions: List[VivaQAItemSchema]
