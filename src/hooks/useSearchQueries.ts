import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { searchService, citationService } from "../services";
import { queryKeys } from "../lib/queryClient";
import { getErrorDisplayMessage } from "../utils/typeAdapters";
import type { SearchRequest, SearchResult } from "../types/api";

// Query: Search documents
export const useSearchQuery = (
  query: string,
  documentIds?: string[],
  enabled = true
) => {
  return useQuery({
    queryKey: queryKeys.search(query, documentIds),
    queryFn: async () => {
      if (!query.trim())
        return { results: [], total_count: 0, query: "", execution_time_ms: 0 };

      const searchRequest: SearchRequest = {
        query: query.trim(),
        document_ids: documentIds,
        limit: 20,
      };

      return await searchService.search(searchRequest);
    },
    enabled: enabled && !!query.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Debounce search queries
    refetchOnWindowFocus: false,
  });
};

// Query: Advanced search with filters
export const useAdvancedSearchQuery = (
  searchRequest: SearchRequest & {
    filters?: {
      date_range?: { start: string; end: string };
      document_types?: string[];
      page_range?: { start: number; end: number };
    };
    sort_by?: "relevance" | "date" | "title";
    sort_order?: "asc" | "desc";
  },
  enabled = true
) => {
  return useQuery({
    queryKey: ["search", "advanced", searchRequest],
    queryFn: () => searchService.advancedSearch(searchRequest),
    enabled: enabled && !!searchRequest.query?.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Query: Search suggestions/autocomplete
export const useSearchSuggestionsQuery = (query: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.searchSuggestions(query),
    queryFn: () => searchService.getSearchSuggestions(query, 5),
    enabled: enabled && query.length >= 2, // Only search after 2 characters
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Debounce suggestions
    refetchOnWindowFocus: false,
  });
};

// Query: Search within specific document
export const useDocumentSearchQuery = (
  documentId: string,
  query: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["search", "document", documentId, query],
    queryFn: () => searchService.searchInDocument(documentId, query),
    enabled: enabled && !!documentId && !!query.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Query: Get all citations
export const useCitationsQuery = () => {
  return useQuery({
    queryKey: queryKeys.citations,
    queryFn: () => citationService.getCitations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Query: Get citations for a specific document
export const useDocumentCitationsQuery = (
  documentId: string,
  enabled = true
) => {
  return useQuery({
    queryKey: queryKeys.documentCitations(documentId),
    queryFn: () => citationService.getCitationsByDocument(documentId),
    enabled: !!documentId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Query: Get single citation
export const useCitationQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.citation(id),
    queryFn: () => citationService.getCitation(id),
    enabled: !!id && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - citations don't change
  });
};

// Mutation: Extract citations from document
export const useExtractCitationsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      pageNumber,
      textSnippet,
      context,
    }: {
      documentId: string;
      pageNumber?: number;
      textSnippet?: string;
      context?: string;
    }) => {
      return await citationService.extractCitations({
        document_id: documentId,
        page_number: pageNumber,
        text_snippet: textSnippet,
        context,
      });
    },
    onSuccess: (newCitations, { documentId }) => {
      // Invalidate document citations to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentCitations(documentId),
      });

      // Invalidate all citations
      queryClient.invalidateQueries({
        queryKey: queryKeys.citations,
      });

      toast.success(`Extracted ${newCitations.length} citations`);
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Mutation: Validate citation
export const useValidateCitationMutation = () => {
  return useMutation({
    mutationFn: (citationId: string) =>
      citationService.validateCitation(citationId),
    onSuccess: (result) => {
      if (result.valid) {
        toast.success(
          `Citation validated (${Math.round(
            result.confidence * 100
          )}% confidence)`
        );
      } else {
        toast.error(`Citation validation failed: ${result.issues?.join(", ")}`);
      }
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Custom hook for search with debouncing
export const useDebouncedSearch = (
  query: string,
  documentIds?: string[],
  delay = 500
) => {
  const [debouncedQuery, setDebouncedQuery] = React.useState(query);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [query, delay]);

  return useSearchQuery(debouncedQuery, documentIds);
};

// Custom hook for comprehensive document search
export const useDocumentSearchWorkflow = (documentId: string) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);

  const searchQuery_ = useDocumentSearchQuery(documentId, searchQuery);
  const citationsQuery = useDocumentCitationsQuery(documentId);
  const extractCitationsMutation = useExtractCitationsMutation();

  React.useEffect(() => {
    if (searchQuery_.data) {
      setSearchResults(searchQuery_.data);
    }
  }, [searchQuery_.data]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    citations: citationsQuery.data || [],
    isSearching: searchQuery_.isLoading,
    isLoadingCitations: citationsQuery.isLoading,
    extractCitations: extractCitationsMutation.mutate,
    isExtractingCitations: extractCitationsMutation.isPending,
    error: searchQuery_.error || citationsQuery.error,
  };
};
