import type { ApiConfig } from "../types/api";

export const getApiConfig = (): ApiConfig => {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
  const timeout = parseInt(import.meta.env.VITE_API_TIMEOUT || "30000", 10);
  const enableLogging = import.meta.env.VITE_ENABLE_API_LOGGING === "true";

  return {
    baseUrl,
    timeout,
    enableLogging,
  };
};

export const isDevelopment = (): boolean => {
  return import.meta.env.VITE_NODE_ENV === "development" || import.meta.env.DEV;
};

export const isProduction = (): boolean => {
  return import.meta.env.VITE_NODE_ENV === "production" || import.meta.env.PROD;
};

// API Endpoints
export const API_ENDPOINTS = {
  // Documents
  DOCUMENTS: "/documents",
  DOCUMENT_UPLOAD: "/documents/upload",
  DOCUMENT_BY_ID: (id: string) => `/documents/${id}`,
  DOCUMENT_CONTENT: (id: string) => `/documents/${id}/content`,

  // Chat
  CHAT_SESSIONS: "/chat/sessions",
  CHAT_SESSION_BY_ID: (id: string) => `/chat/sessions/${id}`,
  CHAT_MESSAGES: "/chat/messages",
  CHAT_MESSAGES_BY_SESSION: (sessionId: string) =>
    `/chat/sessions/${sessionId}/messages`,

  // Search
  SEARCH: "/search",
  ADVANCED_SEARCH: "/advanced-search",

  // Citations
  CITATIONS: "/citations",
  CITATIONS_BY_DOCUMENT: (documentId: string) =>
    `/citations/document/${documentId}`,

  // Health
  HEALTH: "/health",
} as const;
