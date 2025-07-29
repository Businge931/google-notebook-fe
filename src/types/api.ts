export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  type?: string;
}

export interface ApiError {
  error: string;
  message: string;
  type: string;
  status?: number;
}

// Document Types
export interface Document {
  document_id: string;
  filename: string;
  file_size: number;
  upload_date?: string;
  created_at?: string;
  status: "pending" | "processing" | "completed" | "error" | "uploaded";
  processing_stage?: string;
  processing_error?: string;
  content_preview?: string;
  page_count?: number;
  metadata?: Record<string, unknown>;
  // Legacy field for backward compatibility
  id?: string;
}

export interface DocumentUploadRequest {
  file: File;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  status: string;
  message: string;
}

// Chat Types
export interface ChatSession {
  session_id: string;
  document_id?: string;
  created_at: string;
  updated_at?: string;
  last_activity_at?: string;
  message_count?: number;
  status: "active" | "inactive" | "completed";
  success?: boolean;
  document_count?: number;
  initial_response?: string | null;
  message?: string;
}

export interface ChatMessage {
  message_id: string;
  session_id: string;
  user_message: string;
  assistant_response: string;
  citations: Citation[];
  context_used: {
    relevant_chunks: Record<string, unknown>[];
    document_ids: string[];
    similarity_scores: number[];
    total_chunks: number;
    search_query: string;
    metadata: Record<string, unknown>;
  };
  processing_time_ms: number;
  model_used: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: Record<string, unknown>;
    completion_tokens_details?: Record<string, unknown>;
  };
  metadata: {
    finish_reason: string;
    created_at: string;
  };
  timestamp: string;
  // Legacy fields for UI compatibility
  id?: string;
  content?: string;
  role?: "user" | "assistant";
}

export interface ChatMessageRequest {
  session_id: string;
  message: string;
  document_ids?: string[];
  model?: string;
  temperature?: number;
  include_citations?: boolean;
}

export interface ChatSessionRequest {
  session_id?: string;
  document_id?: string; // For frontend convenience - converted to document_ids array in service
  document_ids?: string[];
  initial_message?: string;
  session_name?: string;
  context?: Record<string, unknown>;
}

// Citation Types
export interface Citation {
  id: string;
  document_id: string;
  page_number: number;
  text_snippet: string;
  context?: string;
  confidence_score: number;
  start_char?: number;
  end_char?: number;
}

export interface CitationRequest {
  document_id: string;
  page_number?: number;
  text_snippet?: string;
  context?: string;
}

// Search Types
export interface SearchRequest {
  query: string;
  document_ids?: string[];
  limit?: number;
  similarity_threshold?: number;
}

export interface SearchResult {
  document_id: string;
  document_title: string;
  content_snippet: string;
  page_number?: number;
  similarity_score: number;
  highlights?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  query: string;
  execution_time_ms: number;
}

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  enableLogging: boolean;
}

// Request Options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}
