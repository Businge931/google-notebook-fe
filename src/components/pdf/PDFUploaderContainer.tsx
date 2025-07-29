import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useDocumentUpload, useDocumentStatus } from "../../hooks/useApiHooks";
import { getErrorDisplayMessage } from "../../utils/typeAdapters";
import { documentService } from "../../services/documentService";
import type { Document, UploadProgress } from "../../types";

export interface PDFUploaderContainerHook {
  onFileUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  progress: UploadProgress;
  error: unknown;
}

export const usePDFUploaderContainer = (
  onDocumentUploaded: (document: Document) => void,
  onUploadProgress?: (progress: UploadProgress) => void
): PDFUploaderContainerHook => {
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(
    null
  );
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Cleanup function for WebSocket and polling
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Fallback polling function if WebSocket fails
  const startStatusPolling = useCallback((jobId: string, documentId: string) => {
    console.log('🔄 Starting status polling as WebSocket fallback');
    
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const status = await documentService.getAsyncProcessingStatus(documentId, jobId);
        
        if (status.progress) {
          const progressUpdate: UploadProgress = {
            percentage: status.progress.completion_percentage,
            status: "processing",
            message: `${status.progress.current_stage} - ${status.progress.processed_pages}/${status.progress.total_pages} pages`
          };
          onUploadProgress?.(progressUpdate);
        }
        
        if (status.status === 'completed') {
          const completedProgress: UploadProgress = {
            percentage: 100,
            status: "complete",
            message: "Processing completed successfully!"
          };
          onUploadProgress?.(completedProgress);
          toast.success("Document processed successfully!");
          cleanup();
          setCurrentJobId(null);
        } else if (status.status === 'failed') {
          const failedProgress: UploadProgress = {
            percentage: 0,
            status: "error",
            message: status.error_message || "Processing failed"
          };
          onUploadProgress?.(failedProgress);
          toast.error(status.error_message || "Document processing failed");
          cleanup();
          setCurrentJobId(null);
        }
      } catch (error) {
        console.error('❌ Error polling status:', error);
      }
    }, 3000); // Poll every 3 seconds
  }, [onUploadProgress, cleanup]);

  // Effect to handle async document processing after upload
  useEffect(() => {
    if (uploadedDocumentId && !currentJobId) {
      const startAsyncProcessing = async () => {
        try {
          console.log('🚀 Starting async processing for uploaded document:', uploadedDocumentId);
          
          // Start async processing
          const job = await documentService.startAsyncProcessing(uploadedDocumentId, true);
          setCurrentJobId(job.job_id);
          
          // Update progress to show processing started
          const initialProgress: UploadProgress = {
            percentage: 5,
            status: "processing",
            message: "Processing started in background..."
          };
          onUploadProgress?.(initialProgress);
          
          // Set up WebSocket for real-time updates
          wsRef.current = documentService.createProgressWebSocket(
            job.job_id,
            // onProgress callback
            (progress) => {
              console.log('📊 Progress update:', progress);
              const progressUpdate: UploadProgress = {
                percentage: progress.completion_percentage,
                status: "processing",
                message: `${progress.current_stage} - ${progress.processed_pages}/${progress.total_pages} pages`
              };
              onUploadProgress?.(progressUpdate);
            },
            // onStatusChange callback
            (status) => {
              console.log('📋 Status change:', status);
              if (status === 'completed') {
                const completedProgress: UploadProgress = {
                  percentage: 100,
                  status: "complete",
                  message: "Processing completed successfully!"
                };
                onUploadProgress?.(completedProgress);
                toast.success("Document processed successfully!");
                cleanup();
                setCurrentJobId(null);
              } else if (status === 'failed') {
                const failedProgress: UploadProgress = {
                  percentage: 0,
                  status: "error",
                  message: "Processing failed"
                };
                onUploadProgress?.(failedProgress);
                toast.error("Document processing failed");
                cleanup();
                setCurrentJobId(null);
              }
            },
            // onError callback
            (error) => {
              console.error('❌ WebSocket error:', error);
              // Fall back to polling if WebSocket fails
              startStatusPolling(job.job_id, uploadedDocumentId);
            }
          );
          
        } catch (error) {
          console.error("Failed to start async processing:", error);
          toast.error("Failed to start document processing");
          const errorProgress: UploadProgress = {
            percentage: 0,
            status: "error",
            message: "Failed to start processing"
          };
          onUploadProgress?.(errorProgress);
        }
      };

      startAsyncProcessing();
    }
  }, [uploadedDocumentId, currentJobId, onUploadProgress, cleanup, startStatusPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Document upload hook
  const uploadDocument = useDocumentUpload({
    onSuccess: (response) => {
      const uploadResponse = response as {
        document_id: string;
        filename: string;
        file_size: number;
        status: string;
        processing_stage: string;
        file_url: string;
        upload_timestamp: string;
      };
      setUploadedDocumentId(uploadResponse.document_id);
      toast.success("Document uploaded successfully!");

      // Create initial document object
      const initialDocument: Document = {
        id: uploadResponse.document_id,
        name: uploadResponse.filename,
        size: uploadResponse.file_size, // Will be updated when status is fetched
        uploadedAt: new Date(uploadResponse.upload_timestamp),
        status: "processing",
      };

      onDocumentUploaded(initialDocument);

      // Trigger async document processing via useEffect
      setUploadedDocumentId(uploadResponse.document_id);
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
      onUploadProgress?.({
        percentage: 0,
        status: "error",
        message: getErrorDisplayMessage(error),
      });
    },
  });

  // Document status polling hook
  const documentStatus = useDocumentStatus(uploadedDocumentId || "", {
    onSuccess: (statusData) => {
      const status = statusData as {
        progress?: number;
        status: string;
        error?: string;
      };
      const progress: UploadProgress = {
        percentage: status.progress || 0,
        status:
          status.status === "processed"
            ? "complete"
            : status.status === "error"
            ? "error"
            : "processing",
        message: status.error || undefined,
      };

      onUploadProgress?.(progress);

      // If processing is complete, stop polling and update document
      if (status.status === "processed") {
        // Fetch full document details and notify parent
        // This will be handled by the parent component's document management
      }
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.includes("pdf")) {
        toast.error("Please upload a PDF file");
        return;
      }

      onUploadProgress?.({
        percentage: 0,
        status: "uploading",
        message: "Starting upload...",
      });

      try {
        await uploadDocument.execute(file);
      } catch (error) {
        toast.error(
          "Upload failed: " +
            (error instanceof Error ? error.message : String(error))
        );
      }
    },
    [uploadDocument, onUploadProgress]
  );

  // Calculate overall progress
  const overallProgress: UploadProgress = {
    percentage: uploadDocument.progress,
    status: uploadDocument.loading
      ? "uploading"
      : documentStatus.loading
      ? "processing"
      : uploadDocument.error
      ? "error"
      : "idle",
    message: uploadDocument.error
      ? getErrorDisplayMessage(uploadDocument.error)
      : undefined,
  };

  return {
    onFileUpload: handleFileUpload,
    isUploading: uploadDocument.loading || documentStatus.loading,
    progress: overallProgress,
    error: uploadDocument.error || documentStatus.error,
  };
};
