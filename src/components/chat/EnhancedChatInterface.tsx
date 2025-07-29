import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, FileText } from "lucide-react";
import { useChatSearch } from "../../hooks/useAdvancedSearchQueries";
import { getErrorDisplayMessage } from "../../utils/typeAdapters";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import type {
  Document,
  ChatSession,
  ChatMessage as ChatMessageType,
  Citation,
} from "../../types";

interface EnhancedChatInterfaceProps {
  document: Document;
  onCitationClick: (citation: Citation) => void;
  currentSession?: ChatSession | null;
}

const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  document,
  onCitationClick,
  currentSession = null,
}) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatSearchMutation = useChatSearch([document.id]);
  const { mutate: searchForChat, isPending: isSearching } = chatSearchMutation;

  React.useEffect(() => {
    if (chatSearchMutation.isSuccess && chatSearchMutation.data) {
      const synthesizedResponse = chatSearchMutation.data;
      const aiMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          synthesizedResponse.synthesized_response ||
          "I couldn't find relevant information in the document for your query.",
        timestamp: new Date(),
        citations: (() => {
          if (!synthesizedResponse.citations) return [];

          // Deduplicate citations by page number
          const citationsByPage = new Map<
            number,
            {
              id: string;
              page: number;
              text: string;
              documentId: string;
              snippets: string[];
            }
          >();

          synthesizedResponse.citations.forEach((citation) => {
            const pageNumber = citation.page_number || 1;
            const snippet = citation.snippet || citation.document_title || "";

            if (citationsByPage.has(pageNumber)) {
              // Add snippet to existing page citation
              const existing = citationsByPage.get(pageNumber)!;
              if (snippet && !existing.snippets.includes(snippet)) {
                existing.snippets.push(snippet);
                existing.text = existing.snippets.join(" ... ");
              }
            } else {
              // Create new page citation
              citationsByPage.set(pageNumber, {
                id: citation.id || `citation-page-${pageNumber}`,
                page: pageNumber,
                text: snippet,
                documentId: citation.document_id,
                snippets: snippet ? [snippet] : [],
              });
            }
          });

          return Array.from(citationsByPage.values()).sort(
            (a, b) => a.page - b.page
          );
        })(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      chatSearchMutation.reset();
    }

    if (chatSearchMutation.isError) {
      const errorMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${getErrorDisplayMessage(
          chatSearchMutation.error
        )}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      chatSearchMutation.reset();
    }
  }, [
    chatSearchMutation.isSuccess,
    chatSearchMutation.isError,
    chatSearchMutation.data,
    chatSearchMutation.error,
    chatSearchMutation,
  ]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear messages when document changes
  useEffect(() => {
    setMessages([]);
  }, [document?.id]);

  // Focus input when session is ready
  useEffect(() => {
    if (currentSession && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentSession]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || !currentSession || isSearching) return;

      // Add user message
      const userMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "user",
        content: message.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Use universal synthesized response for comprehensive, single-answer analysis
      searchForChat(message.trim());
    },
    [currentSession, searchForChat, isSearching]
  );

  const handleCitationClick = useCallback(
    (citation: Citation) => {
      onCitationClick(citation);
    },
    [onCitationClick]
  );

  const isLoading = isSearching;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Chat about {document.name}
        </h2>
        <p className="text-sm text-gray-600">
          Ask questions and get answers with citations
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm">
              Ask questions about the document and get AI-powered answers with
              citations.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onCitationClick={handleCitationClick}
          />
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Searching document...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        disabled={!currentSession}
        placeholder="Ask a question about this document..."
      />
    </div>
  );
};

export default EnhancedChatInterface;
