import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../utils/apiConfig";
import type {
  Document,
  DocumentUploadResponse,
  RequestOptions,
} from "../types/api";

// Define status types for backend and frontend
type BackendDocumentStatus = 'uploaded' | 'pending' | 'processing' | 'completed' | 'error' | 'processed';
type FrontendDocumentStatus = 'uploading' | 'processing' | 'ready' | 'error';

// Define DocumentStatus type for status polling
interface DocumentStatus {
  status: FrontendDocumentStatus;
  processing_stage?: string;
  page_count?: number;
  chunk_count?: number;
  processing_time_ms?: number | null;
  progress_percentage: number;
  error_message?: string | null;
}

// Define types for async processing
interface AsyncProcessingJob {
  job_id: string;
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  message: string;
  status_url: string;
  websocket_url: string;
}

interface ProcessingProgress {
  total_pages: number;
  processed_pages: number;
  total_chunks: number;
  processed_chunks: number;
  vectorized_chunks: number;
  current_stage: string;
  memory_usage_mb: number;
  processing_time_ms: number;
  completion_percentage: number;
  estimated_remaining_ms?: number;
}

interface AsyncProcessingStatus {
  job_id: string;
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  progress?: ProcessingProgress;
}

export class DocumentService {
  // Upload a document with automatic optimization for large files
  async uploadDocument(
    file: File,
    options?: RequestOptions
  ): Promise<DocumentUploadResponse> {
    const fileSizeMB = file.size / (1024 * 1024);
    
    console.log("📤 Starting document upload:", {
      filename: file.name,
      size: file.size,
      sizeMB: fileSizeMB.toFixed(2) + 'MB',
      type: file.type
    });

    // Use optimized large file upload for files > 10MB to prevent crashes and performance issues
    if (fileSizeMB > 10) {
      console.log("🚀 Using optimized large file upload for", fileSizeMB.toFixed(2) + 'MB file');
      return this.uploadLargeDocument(file, options);
    }

    // Use standard upload for smaller files
    const formData = new FormData();
    formData.append("file", file);

    const uploadTimeout = Math.max(60000, fileSizeMB * 5000); // 5 seconds per MB, minimum 1 minute
    
    console.log(`⏱️ Upload timeout set to: ${Math.round(uploadTimeout / 1000)} seconds`);

    try {
      const result = await apiClient.upload<DocumentUploadResponse>(
        API_ENDPOINTS.DOCUMENT_UPLOAD,
        formData,
        {
          timeout: uploadTimeout,
          ...options
        }
      );
      
      console.log("✅ Document upload completed successfully:", result);
      return result;
    } catch (error) {
      console.error("❌ Document upload failed:", error);
      throw error;
    }
  }

  // Optimized upload for large files (>10MB) with streaming and progress tracking
  async uploadLargeDocument(
    file: File,
    options?: RequestOptions
  ): Promise<DocumentUploadResponse> {
    console.log("🚀 Starting optimized large file upload:", {
      filename: file.name,
      size: file.size,
      sizeMB: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
      type: file.type
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("auto_process", "true");
    formData.append("enable_optimization", "true");
    formData.append("client_id", crypto.randomUUID());

    // Extended timeout for large files (up to 30 minutes)
    const fileSizeMB = file.size / (1024 * 1024);
    const uploadTimeout = Math.max(300000, fileSizeMB * 15000); // 15 seconds per MB, minimum 5 minutes
    
    console.log(`⏱️ Large file upload timeout set to: ${Math.round(uploadTimeout / 1000)} seconds`);

    try {
      const result = await apiClient.upload<DocumentUploadResponse>(
        "/documents/upload-large", // Use optimized large file endpoint
        formData,
        {
          timeout: uploadTimeout,
          ...options
        }
      );
      
      console.log("✅ Large file upload completed successfully:", result);
      return result;
    } catch (error) {
      console.error("❌ Large file upload failed:", error);
      throw error;
    }
  }

  // Get all documents
  async getDocuments(options?: RequestOptions): Promise<Document[]> {
    return apiClient.get<Document[]>(API_ENDPOINTS.DOCUMENTS, options);
  }

  // Get document by ID
  async getDocument(id: string, options?: RequestOptions): Promise<Document> {
    return apiClient.get<Document>(API_ENDPOINTS.DOCUMENT_BY_ID(id), options);
  }

  // Get document content
  async getDocumentContent(
    id: string,
    options?: RequestOptions
  ): Promise<{ content: string; page_count: number }> {
    return apiClient.get<{ content: string; page_count: number }>(
      API_ENDPOINTS.DOCUMENT_CONTENT(id),
      options
    );
  }

  // Delete document
  async deleteDocument(id: string, options?: RequestOptions): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.DOCUMENT_BY_ID(id), options);
  }

  // Process document with force reprocessing option (LEGACY - for small files)
  async processDocument(
    documentId: string, 
    forceReprocess: boolean = true
  ): Promise<{
    document_id: string;
    status: string;
    processing_stage: string;
    page_count: number | null;
    chunk_count: number | null;
    processing_time_ms: number | null;
    error_message: string | null;
  }> {
    try {
      // Use the new backend endpoint format with force_reprocess as query parameter
      const queryParam = forceReprocess ? '?force_reprocess=true' : '';
      const response = await apiClient.post<{
        document_id: string;
        status: string;
        processing_stage: string;
        page_count: number | null;
        chunk_count: number | null;
        processing_time_ms: number | null;
        error_message: string | null;
      }>(`/documents/${documentId}/process${queryParam}`);
      
      console.log('Document processing completed:', {
        documentId: response.document_id,
        status: response.status,
        stage: response.processing_stage,
        chunks: response.chunk_count,
        processingTime: response.processing_time_ms
      });
      
      return response;
    } catch (error) {
      console.error("Error processing document:", error);
      throw error;
    }
  }

  // Start async processing for large PDFs (NEW - recommended for all files)
  async startAsyncProcessing(
    documentId: string,
    forceReprocess: boolean = true
  ): Promise<AsyncProcessingJob> {
    try {
      console.log('🚀 Starting async processing for document:', documentId);
      
      const queryParam = forceReprocess ? '?force_reprocess=true' : '';
      const response = await apiClient.post<AsyncProcessingJob>(
        `/documents/${documentId}/process-async${queryParam}`
      );
      
      console.log('✅ Async processing started:', {
        jobId: response.job_id,
        documentId: response.document_id,
        status: response.status,
        statusUrl: response.status_url,
        websocketUrl: response.websocket_url
      });
      
      return response;
    } catch (error) {
      console.error('❌ Error starting async processing:', error);
      throw error;
    }
  }

  // Get async processing status
  async getAsyncProcessingStatus(
    documentId: string,
    jobId: string
  ): Promise<AsyncProcessingStatus> {
    try {
      const response = await apiClient.get<AsyncProcessingStatus>(
        `/documents/${documentId}/processing-status/${jobId}`
      );
      
      return response;
    } catch (error) {
      console.error('❌ Error getting async processing status:', error);
      throw error;
    }
  }

  // Get current processing job for a document
  async getCurrentProcessingJob(documentId: string): Promise<AsyncProcessingStatus | null> {
    try {
      const response = await apiClient.get<AsyncProcessingStatus | { status: string; message: string }>(
        `/documents/${documentId}/processing-status`
      );
      
      // Check if there's an active job
      if ('job_id' in response) {
        return response as AsyncProcessingStatus;
      } else {
        // No active job
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting current processing job:', error);
      return null;
    }
  }

  // Cancel async processing job
  async cancelProcessingJob(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{ job_id: string; status: string; message: string }>(
        `/processing-jobs/${jobId}`
      );
      
      console.log('✅ Processing job cancelled:', response);
      return { success: true, message: response.message };
    } catch (error) {
      console.error('❌ Error cancelling processing job:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Create WebSocket connection for real-time progress updates
  createProgressWebSocket(
    jobId: string,
    onProgress: (progress: ProcessingProgress) => void,
    onStatusChange: (status: string) => void,
    onError: (error: string) => void
  ): WebSocket {
    const wsUrl = `ws://localhost:8000/api/v1/documents/progress/${jobId}`;
    console.log('🔌 Creating WebSocket connection:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected for job:', jobId);
      // Send ping to keep connection alive
      setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress_update' && data.progress) {
          onProgress(data.progress);
        } else if (data.type === 'job_status') {
          onStatusChange(data.status);
        } else if (data.type === 'pong') {
          // Ignore pong responses
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      onError('WebSocket connection error');
    };
    
    ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      if (event.code !== 1000) {
        onError('WebSocket connection closed unexpectedly');
      }
    };
    
    return ws;
  }

  // Check document processing status
  async getDocumentStatus(documentId: string): Promise<DocumentStatus> {
    try {
      // Define the backend document response type
      interface BackendDocumentResponse {
        id: string;
        name: string;
        url?: string;
        status: BackendDocumentStatus;
        processing_stage?: string;
        page_count?: number;
        metadata?: {
          chunk_count?: number;
          [key: string]: unknown;
        };
        processing_error?: string | null;
        created_at?: string;
        updated_at?: string;
      }
      
      // Get document details from the API
      const response = await apiClient.get<BackendDocumentResponse>(
        API_ENDPOINTS.DOCUMENT_BY_ID(documentId)
      );

      // Calculate progress based on processing stage
      const progressPercentage = this.calculateProgressPercentage(response.processing_stage || 'uploaded');
      
      // Map backend status to frontend status
      let frontendStatus: FrontendDocumentStatus;
      switch (response.status) {
        case 'processed':
        case 'completed':
          frontendStatus = 'ready';
          break;
        case 'error':
          frontendStatus = 'error';
          break;
        case 'processing':
          frontendStatus = 'processing';
          break;
        case 'uploaded':
        case 'pending':
        default:
          frontendStatus = 'processing';
      }
      
      // Log status mapping for debugging
      console.log(`Status mapping: ${response.status} -> ${frontendStatus} (${progressPercentage}%)`);
      
      return {
        status: frontendStatus,
        processing_stage: response.processing_stage || 'uploaded',
        page_count: response.page_count,
        chunk_count: response.metadata?.chunk_count as number,
        processing_time_ms: null, // Not available from document details endpoint
        progress_percentage: progressPercentage,
        error_message: response.processing_error
      };
    } catch (error) {
      console.error("Error getting document status:", error);
      return {
        status: 'error',
        progress_percentage: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper method to calculate progress percentage based on status and stage
  private calculateProgressPercentage(processing_stage?: string): number {
    if (!processing_stage) return 0;
    
    // Updated progress mapping based on confirmed backend processing stages
    const stageProgress: Record<string, number> = {
      'upload_complete': 10,
      'uploaded': 10,
      'text_extraction': 20,
      'parsing_started': 30,
      'chunking': 50,
      'vectorization': 70,
      'indexing': 85,
      'complete': 100,
      'processed': 100, // Legacy status mapping
      'completed': 100, // Legacy status mapping
      'parsing_failed': 0,
      'error': 0
    };
    
    return stageProgress[processing_stage.toLowerCase()] || 0;
  }

  // Download document
  async downloadDocument(
    id: string,
    options?: RequestOptions
  ): Promise<Response> {
    return apiClient.download(
      `${API_ENDPOINTS.DOCUMENT_BY_ID(id)}/download`,
      options
    );
  }
}

// Export singleton instance
export const documentService = new DocumentService();
export default documentService;
