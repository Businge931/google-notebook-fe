import type {
  Document as ApiDocument,
  ChatMessage as ApiChatMessage,
  Citation as ApiCitation,
  ChatSession as ApiChatSession,
} from "../types/api";

import type {
  Document as UIDocument,
  ChatMessage as UIChatMessage,
  Citation as UICitation,
  ChatSession as UIChatSession,
} from "../types";

// Convert API Document to UI Document
export const adaptApiDocumentToUI = (apiDocument: ApiDocument): UIDocument => {
  // Backend returns 'document_id' but frontend expects 'id'
  const documentId = apiDocument.document_id || apiDocument.id;
  
  // Validate that we have a valid document ID
  if (!documentId) {
    throw new Error('Document ID is missing from API response');
  }
  
  // Construct PDF download URL for viewing
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
  const pdfUrl = `${baseUrl}/documents/${documentId}/download`;
  
  // Handle date field with fallback
  const dateString = apiDocument.upload_date || apiDocument.created_at;
  const uploadDate = dateString ? new Date(dateString) : new Date();
  
  console.log('🔧 Adapting API document:', {
    originalId: apiDocument.id,
    documentId: apiDocument.document_id,
    finalId: documentId,
    filename: apiDocument.filename,
    status: apiDocument.status
  });
  
  return {
    id: documentId,
    name: apiDocument.filename,
    size: apiDocument.file_size,
    uploadedAt: uploadDate,
    status: adaptDocumentStatus(apiDocument.status),
    totalPages: apiDocument.page_count,
    url: pdfUrl, // Add PDF download URL for viewer
  };
};

// Convert API Document status to UI status
const adaptDocumentStatus = (
  apiStatus: string
): "uploading" | "processing" | "ready" | "error" => {
  console.log('🔍 Adapting document status from backend:', apiStatus);
  
  // Handle all possible statuses from backend
  const status = apiStatus.toLowerCase();
  
  // Statuses that should show as uploading
  if (['pending', 'uploaded', 'uploading'].includes(status)) {
    console.log('📤 Status mapped to: uploading');
    return "uploading";
  }
  
  // Statuses that should show as processing
  if (['processing', 'chunking', 'vectorizing', 'indexing', 'parsing'].includes(status)) {
    console.log('🔄 Status mapped to: processing');
    return "processing";
  }
  
  // Statuses that mean the document is ready
  if (['processed', 'completed', 'ready', 'complete'].includes(status)) {
    console.log('✅ Status mapped to: ready');
    return "ready";
  }
  
  // Any error status
  if (status.includes('error') || status.includes('fail')) {
    console.log('❌ Status mapped to: error');
    return "error";
  }
  
  console.warn('⚠️ Unknown status, defaulting to error:', apiStatus);
  return "error";
};

// Convert API ChatMessage to UI ChatMessage
export const adaptApiChatMessageToUI = (
  apiMessage: ApiChatMessage
): UIChatMessage => {
  // Handle both new backend format and legacy format for compatibility
  const id = apiMessage.message_id || apiMessage.id || `msg_${Date.now()}`;
  const content = apiMessage.assistant_response || apiMessage.content || '';
  const role = apiMessage.role || 'assistant' as const;
  
  return {
    id,
    content,
    role,
    timestamp: new Date(apiMessage.timestamp),
    citations: apiMessage.citations?.map(adaptApiCitationToUI) || [],
  };
};

// Convert API Citation to UI Citation
export const adaptApiCitationToUI = (apiCitation: ApiCitation): UICitation => ({
  id: apiCitation.id,
  page: apiCitation.page_number,
  text: apiCitation.text_snippet,
  documentId: apiCitation.document_id,
});

// Convert API ChatSession to UI ChatSession
export const adaptApiChatSessionToUI = (
  apiSession: ApiChatSession,
  messages: ApiChatMessage[] = []
): UIChatSession => ({
  id: apiSession.session_id,
  documentId: apiSession.document_id || '',
  messages: messages.map(adaptApiChatMessageToUI),
  createdAt: new Date(apiSession.created_at),
  updatedAt: new Date(apiSession.updated_at || apiSession.last_activity_at || apiSession.created_at),
});

// Convert UI types back to API types (for requests)
export const adaptUIMessageToApiRequest = (
  sessionId: string,
  content: string,
  includeCitations = true
) => ({
  session_id: sessionId,
  content,
  include_citations: includeCitations,
});

export const adaptUISessionRequestToApi = (
  documentId: string,
  sessionName?: string
) => ({
  document_id: documentId,
  session_name: sessionName,
});

// Utility function to convert API error to user-friendly message
export const getErrorDisplayMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'type' in error) {
    const errorObj = error as { type: string; message?: string };
    switch (errorObj.type) {
      case "NetworkError":
        return "Unable to connect to the server. Please check your internet connection.";
      case "ValidationError":
        return "Please check your input and try again.";
      case "DocumentError":
        return "There was an issue with the document. Please try uploading again.";
      case "ChatError":
        return "Unable to send message. Please try again.";
      case "FileStorageError":
        return "File upload failed. Please try again.";
      default:
        return (
          errorObj.message || "An unexpected error occurred. Please try again."
        );
    }
  }
  return (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') 
    ? (error as { message: string }).message 
    : "An unexpected error occurred. Please try again.";
};
