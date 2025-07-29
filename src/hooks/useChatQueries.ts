import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { chatService } from "../services";
import { queryKeys, mutationKeys } from "../lib/queryClient";
import {
  adaptApiChatSessionToUI,
  adaptApiChatMessageToUI,
  getErrorDisplayMessage,
} from "../utils/typeAdapters";
import type { ChatSession, ChatMessage } from "../types";

// Query: Get all chat sessions
export const useChatSessionsQuery = () => {
  return useQuery({
    queryKey: queryKeys.chatSessions,
    queryFn: async () => {
      const sessions = await chatService.getSessions();
      return sessions.map((session) => adaptApiChatSessionToUI(session));
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Query: Get single chat session
export const useChatSessionQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.chatSession(id),
    queryFn: async () => {
      const session = await chatService.getSession(id);
      return adaptApiChatSessionToUI(session);
    },
    enabled: !!id && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Query: Get messages for a chat session
export const useChatMessagesQuery = (sessionId: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.chatMessages(sessionId),
    queryFn: async () => {
      const messages = await chatService.getMessages(sessionId);
      return messages.map(adaptApiChatMessageToUI);
    },
    enabled: !!sessionId && enabled,
    staleTime: 30 * 1000, // 30 seconds - messages change frequently
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time feel
  });
};

// Mutation: Create chat session
export const useCreateChatSessionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createChatSession,
    mutationFn: async ({
      documentId,
      sessionName,
      initialMessage,
    }: {
      documentId?: string;
      sessionName?: string;
      initialMessage?: string;
    }) => {
      const sessionId = crypto.randomUUID();
      const session = await chatService.createSession({
        session_id: sessionId,
        document_id: documentId,
        initial_message: initialMessage,
        session_name: sessionName,
      });
      return adaptApiChatSessionToUI(session);
    },
    onSuccess: (newSession) => {
      // Add to sessions list
      queryClient.setQueryData<ChatSession[]>(
        queryKeys.chatSessions,
        (old = []) => [newSession, ...old]
      );

      // Cache the new session
      queryClient.setQueryData(
        queryKeys.chatSession(newSession.id),
        newSession
      );

      // Initialize empty messages array
      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.chatMessages(newSession.id),
        []
      );

      toast.success("Chat session created successfully!");
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Mutation: Send message
export const useSendMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.sendMessage,
    mutationFn: async ({
      sessionId,
      content,
      includeCitations = true,
    }: {
      sessionId: string;
      content: string;
      includeCitations?: boolean;
    }) => {
      const message = await chatService.sendMessage({
        session_id: sessionId,
        message: content,
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        include_citations: includeCitations,
      });
      return adaptApiChatMessageToUI(message);
    },
    onMutate: async ({ sessionId, content }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.chatMessages(sessionId),
      });

      // Snapshot previous messages
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(
        queryKeys.chatMessages(sessionId)
      );

      // Optimistically add user message
      const optimisticUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content,
        role: "user",
        timestamp: new Date(),
        citations: [],
      };

      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.chatMessages(sessionId),
        (old = []) => [...old, optimisticUserMessage]
      );

      return { previousMessages, optimisticUserMessage };
    },
    onSuccess: (newMessage, { sessionId }) => {
      // Remove optimistic message and add real messages
      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.chatMessages(sessionId),
        (old = []) => {
          // Remove the optimistic message
          const withoutOptimistic = old.filter(
            (msg) => !msg.id.startsWith("temp-")
          );
          // Add the real user message and AI response
          return [...withoutOptimistic, newMessage];
        }
      );

      // Update session's updated time
      queryClient.invalidateQueries({
        queryKey: queryKeys.chatSession(sessionId),
      });
    },
    onError: (error, { sessionId }, context) => {
      // Rollback optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(
          queryKeys.chatMessages(sessionId),
          context.previousMessages
        );
      }
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Mutation: Delete chat session
export const useDeleteChatSessionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => chatService.deleteSession(sessionId),
    onMutate: async (deletedId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.chatSessions });

      // Snapshot previous value
      const previousSessions = queryClient.getQueryData<ChatSession[]>(
        queryKeys.chatSessions
      );

      // Optimistically update sessions list
      if (previousSessions) {
        queryClient.setQueryData<ChatSession[]>(
          queryKeys.chatSessions,
          previousSessions.filter((session) => session.id !== deletedId)
        );
      }

      // Remove session and messages from cache
      queryClient.removeQueries({ queryKey: queryKeys.chatSession(deletedId) });
      queryClient.removeQueries({
        queryKey: queryKeys.chatMessages(deletedId),
      });

      return { previousSessions };
    },
    onError: (error, _deletedId, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        queryClient.setQueryData(
          queryKeys.chatSessions,
          context.previousSessions
        );
      }
      toast.error(getErrorDisplayMessage(error));
    },
    onSuccess: () => {
      toast.success("Chat session deleted successfully");
    },
    onSettled: () => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions });
    },
  });
};

// Custom hook for complete chat workflow
export const useChatWorkflow = (sessionId: string) => {
  const sessionQuery = useChatSessionQuery(sessionId);
  const messagesQuery = useChatMessagesQuery(sessionId);
  const sendMessageMutation = useSendMessageMutation();

  return {
    session: sessionQuery.data,
    messages: messagesQuery.data || [],
    isLoadingSession: sessionQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    isLoading: sessionQuery.isLoading || messagesQuery.isLoading,
    error: sessionQuery.error || messagesQuery.error,
    sendMessage: (content: string, includeCitations = true) =>
      sendMessageMutation.mutate({ sessionId, content, includeCitations }),
    isSending: sendMessageMutation.isPending,
    refetchMessages: messagesQuery.refetch,
    refetchSession: sessionQuery.refetch,
  };
};
