import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../utils/apiConfig";
import type { RequestOptions } from "../types/api";

// Citation Types
export interface Citation {
  citation_id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  start_position: number;
  end_position: number;
  text_content: string;
  context: string;
  confidence_score: number;
  citation_type: 'direct_quote' | 'paraphrase' | 'reference' | 'supporting_evidence';
  metadata: Record<string, unknown>;
}

export interface CitationExtractionRequest {
  response_text: string;
  source_chunks: Array<{
    chunk_id: string;
    document_id: string;
    document_title: string;
    text_content: string;
    page_number?: number;
    start_position: number;
    end_position: number;
    metadata: Record<string, unknown>;
  }>;
  context_documents: string[];
  session_id: string;
  options?: {
    min_confidence?: number;
    max_citations?: number;
    citation_types?: string[];
    include_page_references?: boolean;
  };
}

export interface CitationExtractionResponse {
  citations: Citation[];
  extraction_time_ms: number;
  confidence_score: number;
  metadata: Record<string, unknown>;
}

export interface CitationLinkingRequest {
  citations: Citation[];
  target_documents: string[];
  linking_strategy?: 'exact_match' | 'semantic_similarity' | 'hybrid';
}

export interface CitationLinkingResponse {
  linked_citations: Array<{
    citation: Citation;
    linked_documents: string[];
    confidence_scores: number[];
  }>;
  linking_time_ms: number;
  success_rate: number;
}

export interface CitationValidationRequest {
  citations: Citation[];
  source_documents: string[];
  validation_criteria?: {
    check_accuracy?: boolean;
    check_relevance?: boolean;
    check_completeness?: boolean;
  };
}

export interface CitationValidationResponse {
  validation_results: Array<{
    citation: Citation;
    is_valid: boolean;
    accuracy_score: number;
    relevance_score: number;
    issues: string[];
  }>;
  overall_accuracy: number;
  validation_time_ms: number;
}

export interface CitationAnalysisRequest {
  citations: Citation[];
  analysis_type?: 'frequency' | 'quality' | 'coverage' | 'patterns';
  document_ids?: string[];
}

export interface CitationAnalysisResponse {
  patterns: Record<string, unknown>;
  quality_metrics: Record<string, unknown>;
  recommendations: string[];
}

export interface CitationClusteringRequest {
  citations: Citation[];
  clustering_method?: 'topic' | 'document' | 'semantic' | 'temporal';
  max_clusters?: number;
}

export interface CitationClusteringResponse {
  clusters: Array<{
    cluster_id: string;
    theme: string;
    citations: Citation[];
    confidence_score: number;
  }>;
  clustering_time_ms: number;
  silhouette_score: number;
}

export interface BulkCitationProcessingRequest {
  operations: Array<{
    operation_type: 'extract' | 'link' | 'validate' | 'analyze';
    data: unknown;
  }>;
  processing_options?: {
    parallel_processing?: boolean;
    batch_size?: number;
    priority?: 'speed' | 'accuracy';
  };
}

export interface BulkCitationProcessingResponse {
  processed_citations: Citation[];
  processing_time_ms: number;
  success_count: number;
  error_count: number;
  errors?: string[];
}

export class CitationsService {
  // Extract citations from response text and source chunks
  async extractCitations(
    request: CitationExtractionRequest,
    options?: RequestOptions
  ): Promise<CitationExtractionResponse> {
    return apiClient.post<CitationExtractionResponse>(
      `${API_ENDPOINTS.CITATIONS}/extract`,
      request,
      options
    );
  }

  // Link citations to related documents
  async linkCitations(
    request: CitationLinkingRequest,
    options?: RequestOptions
  ): Promise<CitationLinkingResponse> {
    return apiClient.post<CitationLinkingResponse>(
      `${API_ENDPOINTS.CITATIONS}/link`,
      request,
      options
    );
  }

  // Validate citations for accuracy and relevance
  async validateCitations(
    request: CitationValidationRequest,
    options?: RequestOptions
  ): Promise<CitationValidationResponse> {
    return apiClient.post<CitationValidationResponse>(
      `${API_ENDPOINTS.CITATIONS}/validate`,
      request,
      options
    );
  }

  // Analyze citation patterns and quality
  async analyzeCitations(
    request: CitationAnalysisRequest,
    options?: RequestOptions
  ): Promise<CitationAnalysisResponse> {
    return apiClient.post<CitationAnalysisResponse>(
      `${API_ENDPOINTS.CITATIONS}/analyze`,
      request,
      options
    );
  }

  // Cluster citations by topic or document
  async clusterCitations(
    request: CitationClusteringRequest,
    options?: RequestOptions
  ): Promise<CitationClusteringResponse> {
    return apiClient.post<CitationClusteringResponse>(
      `${API_ENDPOINTS.CITATIONS}/cluster`,
      request,
      options
    );
  }

  // Bulk process multiple citation operations
  async bulkProcessCitations(
    request: BulkCitationProcessingRequest,
    options?: RequestOptions
  ): Promise<BulkCitationProcessingResponse> {
    return apiClient.post<BulkCitationProcessingResponse>(
      `${API_ENDPOINTS.CITATIONS}/bulk-process`,
      request,
      options
    );
  }

  // Get citations for a specific session
  async getSessionCitations(
    sessionId: string,
    includeLinks = false,
    includeClusters = false,
    options?: RequestOptions
  ): Promise<Citation[]> {
    const params = new URLSearchParams();
    if (includeLinks) params.append('include_links', 'true');
    if (includeClusters) params.append('include_clusters', 'true');
    
    return apiClient.get<Citation[]>(
      `${API_ENDPOINTS.CITATIONS}/session/${sessionId}?${params.toString()}`,
      options
    );
  }

  // Get citations for a specific document
  async getDocumentCitations(
    documentId: string,
    options?: RequestOptions
  ): Promise<Citation[]> {
    return apiClient.get<Citation[]>(
      API_ENDPOINTS.CITATIONS_BY_DOCUMENT(documentId),
      options
    );
  }
}

export const citationsService = new CitationsService();
