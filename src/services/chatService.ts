import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../utils/apiConfig";
import type {
  ChatSession,
  ChatMessage,
  ChatMessageRequest,
  ChatSessionRequest,
  RequestOptions,
} from "../types/api";

export class ChatService {
  // Create a new chat session
  async createSession(
    request: ChatSessionRequest,
    options?: RequestOptions
  ): Promise<ChatSession> {
    return apiClient.post<ChatSession>(
      API_ENDPOINTS.CHAT_SESSIONS,
      {
        session_id: request.session_id,
        document_ids: request.document_ids || (request.document_id ? [request.document_id] : undefined),
        initial_message: request.initial_message,
        context: request.context || {}
      },
      options
    );
  }

  // Get all chat sessions
  async getSessions(options?: RequestOptions): Promise<ChatSession[]> {
    return apiClient.get<ChatSession[]>(API_ENDPOINTS.CHAT_SESSIONS, options);
  }

  // Get chat session by ID
  async getSession(id: string, options?: RequestOptions): Promise<ChatSession> {
    return apiClient.get<ChatSession>(
      API_ENDPOINTS.CHAT_SESSION_BY_ID(id),
      options
    );
  }

  // Send a message
  async sendMessage(
    request: ChatMessageRequest,
    options?: RequestOptions
  ): Promise<ChatMessage> {
    return apiClient.post<ChatMessage>(
      API_ENDPOINTS.CHAT_MESSAGES_BY_SESSION(request.session_id),
      {
        message: request.message,
        document_ids: request.document_ids,
        model: request.model || "gpt-3.5-turbo",
        temperature: request.temperature || 0.7
      },
      options
    );
  }

  // Get messages for a session
  async getMessages(
    sessionId: string,
    options?: RequestOptions
  ): Promise<ChatMessage[]> {
    return apiClient.get<ChatMessage[]>(
      API_ENDPOINTS.CHAT_MESSAGES_BY_SESSION(sessionId),
      options
    );
  }

  // Delete a chat session
  async deleteSession(id: string, options?: RequestOptions): Promise<void> {
    return apiClient.delete<void>(
      API_ENDPOINTS.CHAT_SESSION_BY_ID(id),
      options
    );
  }

  // Stream chat messages (for real-time responses)
  async streamMessage(
    request: ChatMessageRequest,
    onMessage: (chunk: string) => void,
    onComplete: (message: ChatMessage) => void,
    onError: (error: Error) => void,
    options?: RequestOptions
  ): Promise<void> {
    try {
      const response = await fetch(
        `${apiClient["baseUrl"]}${API_ENDPOINTS.CHAT_MESSAGES}/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          signal: options?.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullMessage = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              // Stream complete
              const finalMessage: ChatMessage = {
                message_id: `msg_${Date.now()}`,
                session_id: request.session_id,
                user_message: request.message,
                assistant_response: fullMessage,
                citations: [],
                context_used: {
                  relevant_chunks: [],
                  document_ids: [],
                  similarity_scores: [],
                  total_chunks: 0,
                  search_query: request.message,
                  metadata: {}
                },
                processing_time_ms: 0,
                model_used: request.model || "gpt-3.5-turbo",
                usage: {
                  completion_tokens: 0,
                  prompt_tokens: 0,
                  total_tokens: 0
                },
                metadata: {
                  finish_reason: "stop",
                  created_at: new Date().toISOString()
                },
                timestamp: new Date().toISOString(),
                // Legacy fields for UI compatibility
                id: `msg_${Date.now()}`,
                content: fullMessage,
                role: "assistant"
              };
              onComplete(finalMessage);
              return;
            }

            try {
              const chunk = JSON.parse(data);
              if (chunk.content) {
                fullMessage += chunk.content;
                onMessage(chunk.content);
              }
            } catch {
              // Ignore parsing errors for incomplete JSON
            }
          }
        }
      }
    } catch (error) {
      onError(error as Error);
    }
  }

  // Get session statistics
  async getSessionStats(
    sessionId: string,
    options?: RequestOptions
  ): Promise<{
    message_count: number;
    total_tokens?: number;
    created_at: string;
    last_activity: string;
  }> {
    return apiClient.get<{
      message_count: number;
      total_tokens?: number;
      created_at: string;
      last_activity: string;
    }>(`${API_ENDPOINTS.CHAT_SESSION_BY_ID(sessionId)}/stats`, options);
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;
