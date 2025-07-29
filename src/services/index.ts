export { apiClient, default as ApiClient } from "./apiClient";
export { documentService, DocumentService } from "./documentService";
export { chatService, ChatService } from "./chatService";
export { searchService, SearchService } from "./searchService";
export { citationService, CitationService } from "./citationService";
export { advancedSearchService, AdvancedSearchService } from "./advancedSearchService";
export { citationsService, CitationsService } from "./citationsService";

export type {
  ApiResponse,
  ApiError,
  RequestOptions,
  Document,
  DocumentUploadRequest,
  DocumentUploadResponse,
  ChatSession,
  ChatMessage,
  ChatMessageRequest,
  ChatSessionRequest,
  Citation,
  CitationRequest,
  SearchRequest,
  SearchResponse,
  SearchResult,
} from "../types/api";

export {
  getApiConfig,
  isDevelopment,
  isProduction,
  API_ENDPOINTS,
} from "../utils/apiConfig";
export {
  ApiException,
  handleApiError,
  getErrorMessage,
  isRetryableError,
} from "../utils/apiError";
