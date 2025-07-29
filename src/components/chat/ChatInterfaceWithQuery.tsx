import React, { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import ChatInterface from "./ChatInterface";
import { useChatWorkflow } from "../../hooks/useChatQueries";
import { useCreateChatSessionMutation } from "../../hooks/useChatQueries";
import { queryKeys } from "../../lib/queryClient";
import {
  adaptApiChatMessageToUI,
  getErrorDisplayMessage,
} from "../../utils/typeAdapters";
import type { Document, Citation, ChatMessage } from "../../types";

interface ChatInterfaceWithQueryProps {
  document: Document | null;
  sessionId?: string;
  onCitationClick: (citation: Citation) => void;
}

const ChatInterfaceWithQuery: React.FC<ChatInterfaceWithQueryProps> = ({
  document,
  sessionId: providedSessionId,
  onCitationClick,
}) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    providedSessionId || null
  );
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

  const queryClient = useQueryClient();

  const createSessionMutation = useCreateChatSessionMutation();
  const chatWorkflow = useChatWorkflow(currentSessionId || "");

  React.useEffect(() => {
    if (
      document &&
      document.status === "ready" &&
      !currentSessionId &&
      !createSessionMutation.isPending
    ) {
      createSessionMutation.mutate(
        {
          documentId: document.id,
          sessionName: `Chat with ${document.name}`,
        },
        {
          onSuccess: (session) => {
            setCurrentSessionId(session.id);
          },
        }
      );
    }
  }, [document, currentSessionId, createSessionMutation]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!currentSessionId || !content.trim()) return;

      try {
        setIsStreaming(true);
        setStreamingMessage("");

        // Use streaming chat service
        const { chatService } = await import("../../services");

        await chatService.streamMessage(
          {
            session_id: currentSessionId,
            message: content,
            document_ids: document ? [document.id] : undefined,
            model: "gpt-3.5-turbo",
            temperature: 0.7,
            include_citations: true,
          },
          // onMessage callback - called for each chunk
          (chunk: string) => {
            setStreamingMessage((prev) => prev + chunk);
          },
          // onComplete callback - called when streaming is done
          (finalMessage) => {
            setIsStreaming(false);
            setStreamingMessage("");

            // Optimistically update the query cache with the final message
            queryClient.setQueryData<ChatMessage[]>(
              queryKeys.chatMessages(currentSessionId),
              (oldMessages = []) => [
                ...oldMessages,
                adaptApiChatMessageToUI(finalMessage),
              ]
            );
          },
          (error) => {
            setIsStreaming(false);
            setStreamingMessage("");
            toast.error(getErrorDisplayMessage(error));
          }
        );
      } catch (error) {
        setIsStreaming(false);
        setStreamingMessage("");
        toast.error(getErrorDisplayMessage(error));
      }
    },
    [currentSessionId, queryClient, document]
  );

  const uiMessages = React.useMemo(() => {
    const messages = chatWorkflow.messages;

    if (isStreaming && streamingMessage) {
      messages.push({
        id: `streaming-${Date.now()}`,
        content: streamingMessage,
        role: "assistant" as const,
        timestamp: new Date(),
        citations: [],
      });
    }

    return messages;
  }, [chatWorkflow.messages, isStreaming, streamingMessage]);

  const isLoading =
    createSessionMutation.isPending ||
    chatWorkflow.isLoading ||
    chatWorkflow.isSending ||
    isStreaming;

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

  // Show loading state if creating session
  if (createSessionMutation.isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Setting up chat session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with document info */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
            <p className="text-sm text-gray-500 truncate">{document.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            {chatWorkflow.messages.length > 0 && (
              <span className="text-xs text-gray-400">
                {chatWorkflow.messages.length} messages
              </span>
            )}
            {(chatWorkflow.isLoadingMessages || chatWorkflow.isSending) && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={uiMessages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onCitationClick={onCitationClick}
        />
      </div>

      {/* Status indicator */}
      {chatWorkflow.error && (
        <div className="p-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">
            {getErrorDisplayMessage(chatWorkflow.error)}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatInterfaceWithQuery;
