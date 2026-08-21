import axios from 'axios';
import type { 
  SystemHealth, 
  Paper, 
  ExtractionResult, 
  ChunkingResult, 
  EmbeddingResult, 
  SearchResponse,
  RAGAssemblyResponse,
  RAGQueryResponse,
  ChatThreadResponse,
  PaperSummaryResponse,
  ComparisonMatrixResponse,
  ResearchGapResponse,
  RAGTriadEvalResponse,
  VivaQAResponse 
} from '../types';

const rawUrl = import.meta.env.VITE_API_BASE_URL || 'https://ai-research-paper-assistant-backend.onrender.com';
export const API_BASE_URL = rawUrl.trim().replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export const checkSystemHealth = async (): Promise<SystemHealth> => {
  const response = await apiClient.get<SystemHealth>('/health');
  return response.data;
};

export const getRootStatus = async () => {
  const response = await apiClient.get('/');
  return response.data;
};

// Paper API calls
export const uploadPaper = async (file: File): Promise<Paper> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<Paper>('/papers/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getPapers = async (): Promise<{ total: number; papers: Paper[] }> => {
  const response = await apiClient.get<{ total: number; papers: Paper[] }>('/papers/');
  return response.data;
};

export const getPaperDetails = async (paperId: string): Promise<Paper> => {
  const response = await apiClient.get<Paper>(`/papers/${paperId}`);
  return response.data;
};

export const deletePaper = async (paperId: string): Promise<{ message: string; paper_id: string }> => {
  const response = await apiClient.delete<{ message: string; paper_id: string }>(`/papers/${paperId}`);
  return response.data;
};

// Stage 14 PDF & Export API calls
export const getPaperPDFUrl = (paperId: string): string => {
  return `${API_BASE_URL}/papers/${paperId}/pdf`;
};

export const downloadResearchDossier = (paperId: string): void => {
  window.open(`${API_BASE_URL}/papers/${paperId}/export`, '_blank');
};

// Stage 15 RAG Triad Evaluation & Viva Q&A API calls
export const evaluateRAGQuery = async (query: string, paperId?: string): Promise<RAGTriadEvalResponse> => {
  const response = await apiClient.post<RAGTriadEvalResponse>('/papers/eval/query', {
    query,
    top_k: 3,
    paper_id: paperId || null,
  });
  return response.data;
};

export const getVivaQABank = async (): Promise<VivaQAResponse> => {
  const response = await apiClient.get<VivaQAResponse>('/papers/eval/viva-qa');
  return response.data;
};

// Stage 3 Text Extraction API calls
export const extractPaperText = async (paperId: string): Promise<ExtractionResult> => {
  const response = await apiClient.post<ExtractionResult>(`/papers/${paperId}/extract`);
  return response.data;
};

export const getPaperText = async (paperId: string): Promise<ExtractionResult> => {
  const response = await apiClient.get<ExtractionResult>(`/papers/${paperId}/text`);
  return response.data;
};

// Stage 4 Chunking API calls
export const chunkPaper = async (
  paperId: string, 
  chunkSize: number = 800, 
  chunkOverlap: number = 150
): Promise<ChunkingResult> => {
  const response = await apiClient.post<ChunkingResult>(
    `/papers/${paperId}/chunk?chunk_size=${chunkSize}&chunk_overlap=${chunkOverlap}`
  );
  return response.data;
};

export const getPaperChunks = async (
  paperId: string, 
  chunkSize: number = 800, 
  chunkOverlap: number = 150
): Promise<ChunkingResult> => {
  const response = await apiClient.get<ChunkingResult>(
    `/papers/${paperId}/chunks?chunk_size=${chunkSize}&chunk_overlap=${chunkOverlap}`
  );
  return response.data;
};

// Stage 5 Vector Embedding API calls
export const generatePaperEmbeddings = async (paperId: string): Promise<EmbeddingResult> => {
  const response = await apiClient.post<EmbeddingResult>(`/papers/${paperId}/embeddings`);
  return response.data;
};

// Stage 6 ChromaDB Indexing API calls
export const indexPaperInChromaDB = async (paperId: string): Promise<{
  paper_id: string;
  collection_name: string;
  total_chunks_indexed: number;
  status: string;
  message: string;
}> => {
  const response = await apiClient.post(`/papers/${paperId}/index`);
  return response.data;
};

export const getVectorDBStats = async (): Promise<{
  collection_name: string;
  total_vectors: number;
  persist_directory: string;
  status: string;
}> => {
  const response = await apiClient.get('/papers/vector-db/stats');
  return response.data;
};

// Stage 7 Semantic Search API calls
export const searchPapers = async (
  query: string,
  topK: number = 3,
  paperId?: string
): Promise<SearchResponse> => {
  const response = await apiClient.post<SearchResponse>('/papers/search', {
    query,
    top_k: topK,
    paper_id: paperId || null,
  });
  return response.data;
};

// Stage 8 RAG Pipeline Assembly API calls
export const assembleRAGPipeline = async (
  query: string,
  topK: number = 3,
  paperId?: string
): Promise<RAGAssemblyResponse> => {
  const response = await apiClient.post<RAGAssemblyResponse>('/papers/rag/assemble', {
    query,
    top_k: topK,
    paper_id: paperId || null,
  });
  return response.data;
};

// Stage 9 Groq LLM RAG Query API calls
export const queryGroqRAG = async (
  query: string,
  topK: number = 3,
  paperId?: string
): Promise<RAGQueryResponse> => {
  const response = await apiClient.post<RAGQueryResponse>('/papers/rag/query', {
    query,
    top_k: topK,
    paper_id: paperId || null,
  });
  return response.data;
};

// Stage 10 Multi-Turn Interactive Chat API calls
export const sendChatMessage = async (
  paperId: string, 
  message: string, 
  topK: number = 3
): Promise<ChatThreadResponse> => {
  const response = await apiClient.post<ChatThreadResponse>(`/papers/${paperId}/chat`, {
    message,
    top_k: topK,
  });
  return response.data;
};

export const getChatHistory = async (paperId: string): Promise<ChatThreadResponse> => {
  const response = await apiClient.get<ChatThreadResponse>(`/papers/${paperId}/chat`);
  return response.data;
};

export const clearChatHistory = async (paperId: string): Promise<{ message: string; paper_id: string }> => {
  const response = await apiClient.delete<{ message: string; paper_id: string }>(`/papers/${paperId}/chat`);
  return response.data;
};

// Stage 11 Paper Summarization API calls
export const summarizePaper = async (
  paperId: string, 
  forceRefresh: boolean = false
): Promise<PaperSummaryResponse> => {
  const response = await apiClient.post<PaperSummaryResponse>(
    `/papers/${paperId}/summarize?force_refresh=${forceRefresh}`
  );
  return response.data;
};

export const getPaperSummary = async (paperId: string): Promise<PaperSummaryResponse> => {
  const response = await apiClient.get<PaperSummaryResponse>(`/papers/${paperId}/summary`);
  return response.data;
};

// Stage 12 Paper Comparison API calls
export const comparePapers = async (paperIds: string[]): Promise<ComparisonMatrixResponse> => {
  const response = await apiClient.post<ComparisonMatrixResponse>('/papers/compare', {
    paper_ids: paperIds,
  });
  return response.data;
};

// Stage 13 Research Gap Detection API calls
export const detectResearchGaps = async (paperId: string): Promise<ResearchGapResponse> => {
  const response = await apiClient.post<ResearchGapResponse>(`/papers/${paperId}/gaps`);
  return response.data;
};
