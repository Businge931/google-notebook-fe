import { useCallback } from "react";
import {
  useApi,
  useUpload,
  useStream,
  usePolling,
  type UseApiOptions,
} from "./useApi";
import {
  documentService,
  chatService,
  searchService,
  citationService,
  type ChatMessage,
} from "../services";

// Document Hooks
export function useDocuments(options?: UseApiOptions) {
  return useApi(() => documentService.getDocuments(), options);
}

export function useDocument(id: string, options?: UseApiOptions) {
  return useApi(() => documentService.getDocument(id), options);
}

export function useDocumentUpload(options?: UseApiOptions) {
  return useUpload(
    async (file: File, onProgress?: (progress: number) => void) => {
      // Simulate progress for now - you can enhance this with actual progress tracking
      const progressInterval = setInterval(() => {
        onProgress?.(Math.min(90, Math.random() * 80 + 10));
      }, 200);

      try {
        const result = await documentService.uploadDocument(file);
        onProgress?.(100);
        return result;
      } finally {
        clearInterval(progressInterval);
      }
    },
    options
  );
}

export function useDocumentStatus(id: string, options?: UseApiOptions) {
  return usePolling(() => documentService.getDocumentStatus(id), [], {
    interval: 2000,
    enabled: !!id,
    ...options,
  });
}

export function useDocumentDelete(options?: UseApiOptions) {
  return useApi((...args: unknown[]) => {
    const [id] = args as [string];
    return documentService.deleteDocument(id);
  }, options);
}

// Chat Hooks
export function useChatSessions(options?: UseApiOptions) {
  return useApi(() => chatService.getSessions(), options);
}

export function useChatSession(id: string, options?: UseApiOptions) {
  return useApi(() => chatService.getSession(id), options);
}

export function useChatMessages(sessionId: string, options?: UseApiOptions) {
  return useApi(() => chatService.getMessages(sessionId), options);
}

export function useCreateChatSession(options?: UseApiOptions) {
  return useApi((...args: unknown[]) => {
    const [documentId, sessionName] = args as [string, string?];
    return chatService.createSession({
      document_id: documentId,
      session_name: sessionName,
    });
  }, options);
}

export function useSendMessage(options?: UseApiOptions) {
  return useApi((...args: unknown[]) => {
    const [sessionId, content, includeCitations = true] = args as [
      string,
      string,
      boolean?
    ];
    return chatService.sendMessage({
      session_id: sessionId,
      message: content,
      include_citations: includeCitations,
    });
  }, options);
}

export function useStreamMessage() {
  return useStream(async (...args: unknown[]) => {
    const [sessionId, content, onChunk, onComplete, onError] = args as [
      string,
      string,
      (chunk: string) => void,
      (message: ChatMessage) => void,
      (error: Error) => void
    ];

    await chatService.streamMessage(
      {
        session_id: sessionId,
        message: content,
        include_citations: true,
      },
      onChunk,
      onComplete,
      onError
    );
  });
}

// Search Hooks
export function useSearch(options?: UseApiOptions) {
  return useApi((...args: unknown[]) => {
    const [query, documentIds, limit] = args as [string, string[]?, number?];
    return searchService.search({
      query,
      document_ids: documentIds,
      limit,
    });
  }, options);
}

export function useAdvancedSearch(options?: UseApiOptions) {
  return useApi((...args: unknown[]) => {
    const [searchRequest] = args as [
      Parameters<typeof searchService.advancedSearch>[0]
    ];
    return searchService.advancedSearch(searchRequest);
  }, options);
}

export function useSearchSuggestions(options?: UseApiOptions) {
  return useApi((...args: unknown[]) => {
    const [query, limit = 5] = args as [string, number?];
    return searchService.getSearchSuggestions(query, limit);
  }, options);
}

export function useSearchInDocument(
  documentId: string,
  options?: UseApiOptions
) {
  return useApi((...args: unknown[]) => {
    const [query] = args as [string];
    return searchService.searchInDocument(documentId, query);
  }, options);
}

// Citation Hooks
export function useCitations(options?: UseApiOptions) {
  return useApi(() => citationService.getCitations(), options);
}

export function useDocumentCitations(
  documentId: string,
  options?: UseApiOptions
) {
  return useApi(
    () => citationService.getCitationsByDocument(documentId),
    options
  );
}

export function useExtractCitations(options?: UseApiOptions) {
  return useApi((...args: unknown[]) => {
    const [documentId, pageNumber, textSnippet, context] = args as [
      string,
      number?,
      string?,
      string?
    ];
    return citationService.extractCitations({
      document_id: documentId,
      page_number: pageNumber,
      text_snippet: textSnippet,
      context,
    });
  }, options);
}

export function useValidateCitation(options?: UseApiOptions) {
  return useApi((...args: unknown[]) => {
    const [citationId] = args as [string];
    return citationService.validateCitation(citationId);
  }, options);
}

// Combined Hooks for Common Workflows
export function useDocumentWorkflow(
  documentId: string,
  options?: UseApiOptions
) {
  const document = useDocument(documentId, options);
  const citations = useDocumentCitations(documentId, options);
  const searchInDoc = useSearchInDocument(documentId, options);

  return {
    document,
    citations,
    searchInDoc,
    isLoading: document.loading || citations.loading,
    hasError: document.error || citations.error,
  };
}

export function useChatWorkflow(sessionId: string, options?: UseApiOptions) {
  const session = useChatSession(sessionId, options);
  const messages = useChatMessages(sessionId, options);
  const sendMessage = useSendMessage(options);
  const streamMessage = useStreamMessage();

  const refreshMessages = useCallback(() => {
    messages.execute();
  }, [messages]);

  return {
    session,
    messages,
    sendMessage,
    streamMessage,
    refreshMessages,
    isLoading: session.loading || messages.loading,
    hasError: session.error || messages.error,
  };
}
