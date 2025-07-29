import { QueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { getErrorDisplayMessage } from "../utils/typeAdapters";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data is considered fresh (5 minutes)
      staleTime: 5 * 60 * 1000,
      // Cache time: How long data stays in cache when unused (10 minutes)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: (failureCount, error: Error) => {
        // Don't retry on 4xx errors (client errors)
        const apiError = error as { status?: number };
        if (
          apiError?.status &&
          apiError.status >= 400 &&
          apiError.status < 500
        ) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for critical data
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Global error handler for mutations
      onError: (error: Error) => {
        toast.error(getErrorDisplayMessage(error));
      },
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Documents
  documents: ["documents"] as const,
  document: (id: string) => ["documents", id] as const,
  documentStatus: (id: string) => ["documents", id, "status"] as const,
  documentContent: (id: string) => ["documents", id, "content"] as const,

  // Chat
  chatSessions: ["chat", "sessions"] as const,
  chatSession: (id: string) => ["chat", "sessions", id] as const,
  chatMessages: (sessionId: string) =>
    ["chat", "sessions", sessionId, "messages"] as const,

  // Search
  search: (query: string, documentIds?: string[]) =>
    ["search", { query, documentIds }] as const,

  // Citations
  citations: ["citations"] as const,
  documentCitations: (documentId: string) =>
    ["citations", "document", documentId] as const,
  citation: (id: string) => ["citations", id] as const,
  sessionCitations: (sessionId: string) =>
    ["citations", "session", sessionId] as const,

  // Advanced Search
  advancedSearch: ["advanced-search"] as const,
  enhancedSearch: (request: Record<string, unknown>) =>
    ["advanced-search", "enhanced", request] as const,
  contextualSearch: (request: Record<string, unknown>) =>
    ["advanced-search", "contextual", request] as const,
  multiDocumentSearch: (request: Record<string, unknown>) =>
    ["advanced-search", "multi-document", request] as const,
  searchSuggestions: (query: string, documentIds?: string[]) =>
    ["advanced-search", "suggestions", { query, documentIds }] as const,
  searchAnalytics: (request: Record<string, unknown>) =>
    ["advanced-search", "analytics", request] as const,
} as const;

// Mutation keys for optimistic updates
export const mutationKeys = {
  uploadDocument: ["mutations", "uploadDocument"] as const,
  createChatSession: ["mutations", "createChatSession"] as const,
  sendMessage: ["mutations", "sendMessage"] as const,
  deleteDocument: ["mutations", "deleteDocument"] as const,
  advancedSearch: ["mutations", "advancedSearch"] as const,
  citations: ["mutations", "citations"] as const,
  chatSearch: (documentIds: string[]) => ["mutations", "chatSearch", documentIds] as const,
} as const;
