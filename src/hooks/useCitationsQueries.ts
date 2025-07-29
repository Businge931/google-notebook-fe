import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { citationsService } from "../services";
import { mutationKeys } from "../lib/queryClient";
import { getErrorDisplayMessage } from "../utils/typeAdapters";
import type {
  Citation,
  CitationExtractionRequest,
  CitationExtractionResponse,
  CitationLinkingRequest,
  CitationValidationRequest,
  CitationAnalysisRequest,
  CitationClusteringRequest,
  BulkCitationProcessingRequest,
} from "../services/citationsService";

// Query: Get citations for a specific session
export const useSessionCitationsQuery = (
  sessionId: string,
  options: {
    includeLinks?: boolean;
    includeClusters?: boolean;
    enabled?: boolean;
  } = {}
) => {
  const { includeLinks = false, includeClusters = false, enabled = true } = options;

  return useQuery({
    queryKey: ["citations", "session", sessionId, { includeLinks, includeClusters }],
    queryFn: () => citationsService.getSessionCitations(sessionId, includeLinks, includeClusters),
    enabled: enabled && !!sessionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};

// Query: Get citations for a specific document
export const useDocumentCitationsQuery = (
  documentId: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["citations", "document", documentId],
    queryFn: () => citationsService.getDocumentCitations(documentId),
    enabled: enabled && !!documentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Mutation: Extract citations from response text
export const useCitationExtractionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...mutationKeys.citations, "extract"],
    mutationFn: (request: CitationExtractionRequest) =>
      citationsService.extractCitations(request),
    onSuccess: (_, variables) => {
      // Invalidate session citations to refresh the list
      if (variables.session_id) {
        queryClient.invalidateQueries({
          queryKey: ["citations", "session", variables.session_id],
        });
      }
      
      // Update document citations if applicable
      const documentIds = variables.source_chunks.map(chunk => chunk.document_id);
      documentIds.forEach(docId => {
        queryClient.invalidateQueries({
          queryKey: ["citations", "document", docId],
        });
      });
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Mutation: Link citations to documents
export const useCitationLinkingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...mutationKeys.citations, "link"],
    mutationFn: (request: CitationLinkingRequest) =>
      citationsService.linkCitations(request),
    onSuccess: () => {
      // Invalidate related citation queries
      queryClient.invalidateQueries({
        queryKey: ["citations"],
      });
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Mutation: Validate citations
export const useCitationValidationMutation = () => {
  return useMutation({
    mutationKey: [...mutationKeys.citations, "validate"],
    mutationFn: (request: CitationValidationRequest) =>
      citationsService.validateCitations(request),
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Mutation: Analyze citations
export const useCitationAnalysisMutation = () => {
  return useMutation({
    mutationKey: [...mutationKeys.citations, "analyze"],
    mutationFn: (request: CitationAnalysisRequest) =>
      citationsService.analyzeCitations(request),
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Mutation: Cluster citations
export const useCitationClusteringMutation = () => {
  return useMutation({
    mutationKey: [...mutationKeys.citations, "cluster"],
    mutationFn: (request: CitationClusteringRequest) =>
      citationsService.clusterCitations(request),
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Mutation: Bulk process citations
export const useBulkCitationProcessingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...mutationKeys.citations, "bulk-process"],
    mutationFn: (request: BulkCitationProcessingRequest) =>
      citationsService.bulkProcessCitations(request),
    onSuccess: () => {
      // Invalidate all citation queries after bulk processing
      queryClient.invalidateQueries({
        queryKey: ["citations"],
      });
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Hook: Combined citation functionality for chat interface
export const useChatCitations = (sessionId: string) => {
  const queryClient = useQueryClient();
  const extractCitationsMutation = useCitationExtractionMutation();
  const linkCitationsMutation = useCitationLinkingMutation();
  const validateCitationsMutation = useCitationValidationMutation();

  // Get session citations
  const sessionCitationsQuery = useSessionCitationsQuery(sessionId, {
    includeLinks: true,
    includeClusters: true,
  });

  // Extract citations from chat response
  const extractCitationsFromResponse = async (
    responseText: string,
    sourceChunks: Array<{
      chunk_id: string;
      document_id: string;
      document_title: string;
      text_content: string;
      page_number?: number;
      start_position: number;
      end_position: number;
      metadata: Record<string, unknown>;
    }>,
    contextDocuments: string[],
    options?: {
      min_confidence?: number;
      max_citations?: number;
      citation_types?: string[];
      include_page_references?: boolean;
    }
  ): Promise<CitationExtractionResponse> => {
    return extractCitationsMutation.mutateAsync({
      response_text: responseText,
      source_chunks: sourceChunks,
      context_documents: contextDocuments,
      session_id: sessionId,
      options,
    });
  };

  // Navigate to citation in PDF
  const navigateToCitation = (citation: Citation) => {
    // This will be handled by the PDF viewer component
    // Emit a custom event that the PDF viewer can listen to
    const event = new CustomEvent('navigateToCitation', {
      detail: {
        documentId: citation.document_id,
        pageNumber: citation.page_number,
        startPosition: citation.start_position,
        endPosition: citation.end_position,
      },
    });
    window.dispatchEvent(event);
  };

  // Refresh citations
  const refreshCitations = () => {
    queryClient.invalidateQueries({
      queryKey: ["citations", "session", sessionId],
    });
  };

  return {
    // Data
    citations: sessionCitationsQuery.data || [],
    isLoadingCitations: sessionCitationsQuery.isLoading,
    citationsError: sessionCitationsQuery.error,

    // Actions
    extractCitationsFromResponse,
    navigateToCitation,
    refreshCitations,

    // States
    isExtractingCitations: extractCitationsMutation.isPending,
    isLinkingCitations: linkCitationsMutation.isPending,
    isValidatingCitations: validateCitationsMutation.isPending,

    // Errors
    extractionError: extractCitationsMutation.error,
    linkingError: linkCitationsMutation.error,
    validationError: validateCitationsMutation.error,

    // Reset functions
    resetExtraction: () => extractCitationsMutation.reset(),
    resetLinking: () => linkCitationsMutation.reset(),
    resetValidation: () => validateCitationsMutation.reset(),
  };
};
