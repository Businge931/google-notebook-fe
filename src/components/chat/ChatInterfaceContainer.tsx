import React, { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import ChatInterface from "./ChatInterface";
import { chatService } from "../../services";
import type { Document, Citation, ChatMessage } from "../../types";
import type { ChatMessage as ApiChatMessage } from "../../types/api";

interface ChatInterfaceContainerProps {
  document: Document | null;
  sessionId?: string | null;
  onCitationClick: (citation: Citation) => void;
}

const ChatInterfaceContainer: React.FC<ChatInterfaceContainerProps> = ({
  document,
  sessionId,
  onCitationClick,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim()) {
        toast.error("Please enter a message");
        return;
      }

      setIsLoading(true);
      
      // Add user message immediately to UI
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        content,
        role: "user",
        timestamp: new Date(),
        citations: []
      };
      setMessages(prev => [...prev, userMessage]);

      try {
        // Call backend API: POST /api/v1/chat/sessions/{sessionId}/messages
        const response: ApiChatMessage = await chatService.sendMessage({
          session_id: sessionId,
          message: content,
          model: "gpt-3.5-turbo",
          temperature: 0.7
        });

        // Add AI response to UI
        const aiMessage: ChatMessage = {
          id: response.message_id,
          content: response.assistant_response,
          role: "assistant",
          timestamp: new Date(response.timestamp),
          citations: response.citations?.map(citation => ({
            id: citation.id,
            page: citation.page_number,
            text: citation.text_snippet,
            documentId: citation.document_id
          })) || []
        };
        
        setMessages(prev => [...prev, aiMessage]);
        toast.success("Message sent successfully");
        
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error("Failed to send message. Please try again.");
        // Remove the user message that failed to send
        setMessages(prev => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">
            Please upload a document to start chatting
          </p>
        </div>
      </div>
    );
  }

  if (document.status !== "ready") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">
            {document.status === "uploading" && "Uploading document..."}
            {document.status === "processing" && "Processing document..."}
            {document.status === "error" && "Error processing document"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChatInterface
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      onCitationClick={onCitationClick}
    />
  );
};

export default ChatInterfaceContainer;
