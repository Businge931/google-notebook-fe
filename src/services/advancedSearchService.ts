import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../utils/apiConfig";
import type { RequestOptions } from "../types/api";

// Advanced Search Types
export interface EnhancedSearchRequest {
  query: string;
  max_results?: number;
  document_ids?: string[];
  similarity_threshold?: number;
  search_type?: 'semantic' | 'keyword' | 'hybrid';
  include_metadata?: boolean;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  content: string;  // Updated to match backend API response
  similarity_score: number;
  start_position: number;
  end_position: number;
  page_number?: number;
  metadata: Record<string, unknown>;
}

export interface SearchCluster {
  cluster_id: string;
  theme: string;
  results: SearchResult[];
  confidence_score: number;
}

export interface SearchSuggestion {
  suggestion: string;
  confidence: number;
  type: 'query_expansion' | 'related_topic' | 'clarification';
}

export interface EnhancedSearchResponse {
  results: SearchResult[];
  clusters: SearchCluster[];
  suggestions: SearchSuggestion[];
  citations: unknown[]; // Will be defined by citations service
  total_results: number;
  search_time_ms: number;
  query_analysis: Record<string, unknown>;
  performance_metrics: Record<string, unknown>;
  timestamp: string;
}

// Synthesized Response for universal document analysis
export interface SynthesizedResponse {
  synthesized_response: string;
  citations: {
    id: string;
    document_title: string;
    page_number: number;
    document_id: string;
    snippet: string;
    relevance_score: number;
    context_before?: string;
    context_after?: string;
    citation_type?: string;
    formatted_citation?: string;
  }[];
  confidence: number;
  sources_used: number;
  query_analysis: {
    question_type: 'specific' | 'definition' | 'enumeration' | 'comparison' | 'general';
    years: number[];
    entities: string[];
    keywords: string[];
  };
  timestamp: string;
}

export interface ContextualSearchRequest {
  query: string;
  context: Record<string, unknown>;
  max_results?: number;
  document_ids?: string[];
}

export interface MultiDocumentSearchRequest {
  query: string;
  document_ids: string[];
  search_type?: 'semantic' | 'keyword' | 'qa';
  max_results?: number;
}

export interface SearchAnalyticsRequest {
  time_range?: {
    start: string;
    end: string;
  };
  document_ids?: string[];
  include_patterns?: boolean;
}

export interface SearchAnalyticsResponse {
  total_searches: number;
  unique_queries: number;
  average_response_time_ms: number;
  popular_queries: string[];
  search_patterns: Record<string, unknown>;
  performance_metrics: Record<string, unknown>;
  improvement_suggestions: string[];
}

export class AdvancedSearchService {
  // Enhanced search with multiple engines and clustering
  async enhancedSearch(
    request: EnhancedSearchRequest,
    options?: RequestOptions
  ): Promise<EnhancedSearchResponse> {
    return apiClient.post<EnhancedSearchResponse>(
      `${API_ENDPOINTS.ADVANCED_SEARCH}/enhanced`,
      request,
      options
    );
  }

  // Contextual search with conversation history
  async contextualSearch(
    request: ContextualSearchRequest,
    options?: RequestOptions
  ): Promise<EnhancedSearchResponse> {
    return apiClient.post<EnhancedSearchResponse>(
      `${API_ENDPOINTS.ADVANCED_SEARCH}/contextual`,
      request,
      options
    );
  }

  // Multi-document search across specific documents
  async multiDocumentSearch(
    request: MultiDocumentSearchRequest,
    options?: RequestOptions
  ): Promise<SearchResult[]> {
    return apiClient.post<SearchResult[]>(
      `${API_ENDPOINTS.ADVANCED_SEARCH}/multi-document`,
      request,
      options
    );
  }

  // Get search analytics and insights
  async getSearchAnalytics(
    request: SearchAnalyticsRequest = {},
    options?: RequestOptions
  ): Promise<SearchAnalyticsResponse> {
    return apiClient.post<SearchAnalyticsResponse>(
      `${API_ENDPOINTS.ADVANCED_SEARCH}/analytics`,
      request,
      options
    );
  }

  // Search suggestions based on query
  async getSearchSuggestions(
    query: string,
    document_ids?: string[],
    options?: RequestOptions
  ): Promise<SearchSuggestion[]> {
    return apiClient.post<SearchSuggestion[]>(
      `${API_ENDPOINTS.ADVANCED_SEARCH}/suggestions`,
      { query, document_ids },
      options
    );
  }

  // Synthesized comprehensive response - UNIVERSAL for any document type
  async getSynthesizedResponse(
    request: EnhancedSearchRequest,
    options?: RequestOptions
  ): Promise<SynthesizedResponse> {
    return apiClient.post<SynthesizedResponse>(
      `${API_ENDPOINTS.ADVANCED_SEARCH}/synthesized`,
      request,
      options
    );
  }
}

export const advancedSearchService = new AdvancedSearchService();
