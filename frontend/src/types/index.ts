export interface Paper {
  id: string;
  title: string;
  filename: string;
  file_path: string;
  pages: number;
  chunks_count: number;
  uploaded_at: string;
  status: 'uploaded' | 'processing' | 'chunked' | 'embedded' | 'indexed' | 'failed';
}

export interface PageText {
  page_number: number;
  raw_text_length: number;
  cleaned_text_length: number;
  word_count: number;
  text: string;
}

export interface ExtractionResult {
  paper_id: string;
  total_pages: number;
  total_words: number;
  total_characters: number;
  pages: PageText[];
}

export interface ChunkItem {
  chunk_index: number;
  paper_id: string;
  page_number: number;
  start_char: number;
  end_char: number;
  char_count: number;
  word_count: number;
  text: string;
}

export interface ChunkingResult {
  paper_id: string;
  chunk_size: number;
  chunk_overlap: number;
  total_chunks: number;
  total_words: number;
  chunks: ChunkItem[];
}

export interface EmbeddingItem {
  chunk_index: number;
  page_number: number;
  vector_dimensions: number;
  sample_vector: number[];
  text_snippet: string;
}

export interface EmbeddingResult {
  paper_id: string;
  embedding_model: string;
  dimensions: number;
  total_embeddings: number;
  items: EmbeddingItem[];
}

export interface SearchResultItem {
  rank: number;
  chunk_index: number;
  page_number: number;
  paper_id: string;
  paper_name: string;
  similarity_score: number;
  similarity_percentage: number;
  text: string;
}

export interface SearchResponse {
  query: string;
  top_k: number;
  total_results: number;
  results: SearchResultItem[];
}

export interface RAGSourceSchema {
  paper_name: string;
  page_number: number;
  chunk_index: number;
  similarity_score: number;
  similarity_percentage: number;
  text_snippet: string;
}

export interface RAGAssemblyResponse {
  query: string;
  top_k: number;
  sources_count: number;
  system_prompt: string;
  user_prompt: string;
  context_window_text: string;
  sources: RAGSourceSchema[];
}

export interface RAGQueryResponse {
  query: string;
  answer: string;
  model: string;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  sources: RAGSourceSchema[];
}

export interface ChatMessageSchema {
  id?: number;
  paper_id: string;
  role: 'user' | 'assistant';
  message: string;
  sources?: RAGSourceSchema[];
  created_at?: string;
}

export interface ChatThreadResponse {
  paper_id: string;
  total_messages: number;
  messages: ChatMessageSchema[];
}

export interface PaperSummaryResponse {
  paper_id: string;
  abstract_summary: string;
  problem: string;
  methodology: string;
  dataset: string;
  results: string;
  limitations: string;
  future_work: string;
  created_at?: string;
}

export interface ComparisonItemSchema {
  paper_id: string;
  title: string;
  problem: string;
  methodology: string;
  dataset: string;
  results: string;
  strengths: string;
  limitations: string;
}

export interface ComparisonMatrixResponse {
  total_papers: number;
  compared_papers: ComparisonItemSchema[];
  comparative_summary: string;
}

export interface ProjectIdeaSchema {
  title: string;
  description: string;
  target_gap_addressed: string;
}

export interface ResearchGapResponse {
  paper_id: string;
  paper_title: string;
  explicit_gaps: string[];
  inferred_gaps: string[];
  potential_research_ideas: ProjectIdeaSchema[];
}

export interface RAGTriadEvalResponse {
  query: string;
  answer: string;
  context_relevance_score: number;
  groundedness_score: number;
  answer_relevance_score: number;
  overall_triad_score: number;
  retrieved_chunks_count: number;
  eval_summary: string;
  sources: RAGSourceSchema[];
}

export interface VivaQAItemSchema {
  id: number;
  category: string;
  question: string;
  answer: string;
  key_points: string[];
  code_snippet?: string;
}

export interface VivaQAResponse {
  total_questions: number;
  categories: string[];
  questions: VivaQAItemSchema[];
}

export interface ChatMessage {
  id?: number;
  paper_id: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  sources?: RAGSource[];
  created_at?: string;
}

export interface RAGSource {
  paper_name: string;
  page_number: number;
  chunk_index: number;
  text_snippet: string;
  similarity_score?: number;
}

export interface SystemHealth {
  status: string;
  groq_api_configured: boolean;
  groq_model: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
}

export interface PaperSummary {
  abstract_summary: string;
  problem: string;
  methodology: string;
  dataset: string;
  results: string;
  limitations: string;
  future_work: string;
}
