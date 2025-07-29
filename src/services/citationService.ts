import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../utils/apiConfig";
import type { Citation, CitationRequest, RequestOptions } from "../types/api";

export class CitationService {
  // Extract citations from a document
  async extractCitations(
    request: CitationRequest,
    options?: RequestOptions
  ): Promise<Citation[]> {
    return apiClient.post<Citation[]>(
      API_ENDPOINTS.CITATIONS,
      request,
      options
    );
  }

  // Get all citations
  async getCitations(options?: RequestOptions): Promise<Citation[]> {
    return apiClient.get<Citation[]>(API_ENDPOINTS.CITATIONS, options);
  }

  // Get citations for a specific document
  async getCitationsByDocument(
    documentId: string,
    options?: RequestOptions
  ): Promise<Citation[]> {
    return apiClient.get<Citation[]>(
      API_ENDPOINTS.CITATIONS_BY_DOCUMENT(documentId),
      options
    );
  }

  // Get citation by ID
  async getCitation(id: string, options?: RequestOptions): Promise<Citation> {
    return apiClient.get<Citation>(`${API_ENDPOINTS.CITATIONS}/${id}`, options);
  }

  // Validate citation
  async validateCitation(
    citationId: string,
    options?: RequestOptions
  ): Promise<{ valid: boolean; confidence: number; issues?: string[] }> {
    return apiClient.post<{
      valid: boolean;
      confidence: number;
      issues?: string[];
    }>(`${API_ENDPOINTS.CITATIONS}/${citationId}/validate`, {}, options);
  }

  // Get citation context (surrounding text)
  async getCitationContext(
    citationId: string,
    contextLength: number = 200,
    options?: RequestOptions
  ): Promise<{ before: string; after: string; full_context: string }> {
    return apiClient.get<{
      before: string;
      after: string;
      full_context: string;
    }>(
      `${API_ENDPOINTS.CITATIONS}/${citationId}/context?length=${contextLength}`,
      options
    );
  }
}

// Export singleton instance
export const citationService = new CitationService();
export default citationService;
