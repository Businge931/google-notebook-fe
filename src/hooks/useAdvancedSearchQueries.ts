import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { advancedSearchService } from "../services";
import { mutationKeys } from "../lib/queryClient";
import { getErrorDisplayMessage } from "../utils/typeAdapters";
import type {
  EnhancedSearchRequest,
  ContextualSearchRequest,
  MultiDocumentSearchRequest,
  SearchAnalyticsRequest,
  SynthesizedResponse,
} from "../services/advancedSearchService";

// Query: Enhanced search with clustering and suggestions
export const useEnhancedSearchQuery = (
  request: EnhancedSearchRequest,
  enabled = true
) => {
  return useQuery({
    queryKey: ["advanced-search", "enhanced", request],
    queryFn: () => advancedSearchService.enhancedSearch(request),
    enabled: enabled && !!request.query,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};

// Query: Contextual search with conversation history
export const useContextualSearchQuery = (
  request: ContextualSearchRequest,
  enabled = true
) => {
  return useQuery({
    queryKey: ["advanced-search", "contextual", request],
    queryFn: () => advancedSearchService.contextualSearch(request),
    enabled: enabled && !!request.query,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
};

// Query: Multi-document search
export const useMultiDocumentSearchQuery = (
  request: MultiDocumentSearchRequest,
  enabled = true
) => {
  return useQuery({
    queryKey: ["advanced-search", "multi-document", request],
    queryFn: () => advancedSearchService.multiDocumentSearch(request),
    enabled: enabled && !!request.query && request.document_ids.length > 0,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
};

// Query: Search suggestions
export const useSearchSuggestionsQuery = (
  query: string,
  documentIds?: string[],
  enabled = true
) => {
  return useQuery({
    queryKey: ["advanced-search", "suggestions", { query, documentIds }],
    queryFn: () => advancedSearchService.getSearchSuggestions(query, documentIds),
    enabled: enabled && !!query && query.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};

// Query: Search analytics
export const useSearchAnalyticsQuery = (
  request: SearchAnalyticsRequest = {},
  enabled = true
) => {
  return useQuery({
    queryKey: ["advanced-search", "analytics", request],
    queryFn: () => advancedSearchService.getSearchAnalytics(request),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

// Mutation: Enhanced search with optimistic updates
export const useEnhancedSearchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...mutationKeys.advancedSearch, "enhanced"],
    mutationFn: (request: EnhancedSearchRequest) =>
      advancedSearchService.enhancedSearch(request),
    onSuccess: (data, variables) => {
      // Update the query cache with the new results
      queryClient.setQueryData(
        ["advanced-search", "enhanced", variables],
        data
      );
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["advanced-search", "suggestions"],
      });
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error) || "Search failed");
    },
  });
};

// Mutation: Contextual search
export const useContextualSearchMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...mutationKeys.advancedSearch, "contextual"],
    mutationFn: (request: ContextualSearchRequest) =>
      advancedSearchService.contextualSearch(request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ["advanced-search", "contextual", variables],
        data
      );
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error) || "Contextual search failed");
    },
  });
};

// Mutation: Chat search with universal synthesized response
export const useChatSearch = (documentIds: string[]) => {
  return useMutation({
    mutationKey: mutationKeys.chatSearch(documentIds),
    mutationFn: async (
      query: string,
      _context?: { document_name?: string; document_id?: string },
      options?: { maxResults?: number; searchType?: 'semantic' | 'keyword' | 'hybrid' }
    ): Promise<SynthesizedResponse> => {
      const request: EnhancedSearchRequest = {
        query,
        document_ids: documentIds,
        max_results: options?.maxResults || 5,
        search_type: options?.searchType || 'hybrid',
        include_metadata: true,
      };
      
      // Use synthesized response for comprehensive, single-answer analysis
      return advancedSearchService.getSynthesizedResponse(request);
    },
    onError: (error) => {
      console.error('Chat search failed:', error);
      toast.error(getErrorDisplayMessage(error) || "Search failed");
    },
  });
};
