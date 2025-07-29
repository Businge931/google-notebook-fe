import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../utils/apiConfig";
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
  RequestOptions,
} from "../types/api";

export class SearchService {
  // Basic search
  async search(
    request: SearchRequest,
    options?: RequestOptions
  ): Promise<SearchResponse> {
    return apiClient.post<SearchResponse>(
      API_ENDPOINTS.SEARCH,
      request,
      options
    );
  }

  // Advanced search with filters
  async advancedSearch(
    request: SearchRequest & {
      filters?: {
        date_range?: { start: string; end: string };
        document_types?: string[];
        page_range?: { start: number; end: number };
      };
      sort_by?: "relevance" | "date" | "title";
      sort_order?: "asc" | "desc";
    },
    options?: RequestOptions
  ): Promise<SearchResponse> {
    return apiClient.post<SearchResponse>(
      API_ENDPOINTS.ADVANCED_SEARCH,
      request,
      options
    );
  }

  // Search within a specific document
  async searchInDocument(
    documentId: string,
    query: string,
    options?: RequestOptions
  ): Promise<SearchResult[]> {
    const request: SearchRequest = {
      query,
      document_ids: [documentId],
    };

    const response = await this.search(request, options);
    return response.results;
  }

  // Get search suggestions/autocomplete
  async getSearchSuggestions(
    query: string,
    limit: number = 5,
    options?: RequestOptions
  ): Promise<string[]> {
    return apiClient.get<string[]>(
      `${API_ENDPOINTS.SEARCH}/suggestions?q=${encodeURIComponent(
        query
      )}&limit=${limit}`,
      options
    );
  }

  // Get popular search terms
  async getPopularSearches(
    limit: number = 10,
    options?: RequestOptions
  ): Promise<{ query: string; count: number }[]> {
    return apiClient.get<{ query: string; count: number }[]>(
      `${API_ENDPOINTS.SEARCH}/popular?limit=${limit}`,
      options
    );
  }
}

// Export singleton instance
export const searchService = new SearchService();
export default searchService;
