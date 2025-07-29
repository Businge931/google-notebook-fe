import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "react-hot-toast";
import { documentService } from "../services";
import { queryKeys, mutationKeys } from "../lib/queryClient";
import {
  adaptApiDocumentToUI,
  getErrorDisplayMessage,
} from "../utils/typeAdapters";
import type { Document as UIDocument } from "../types";

// Union of all possible backend status values
export const BACKEND_STATUSES = [
  "uploaded",
  "pending",
  "processing",
  "completed",
  "error",
  "processed",
  "chunking",
  "vectorizing",
  "indexing",
] as const;

export const FRONTEND_STATUSES = [
  "uploading",
  "processing",
  "ready",
  "error",
] as const;

type BackendStatus = (typeof BACKEND_STATUSES)[number];
type FrontendStatus = (typeof FRONTEND_STATUSES)[number];

interface DocumentStatusResponse {
  status: BackendStatus;
  processing_stage?: string;
  page_count?: number;
  chunk_count?: number;
  processing_time_ms?: number | null;
  progress_percentage: number;
  error_message?: string | null;
}

// Type guard for BackendStatus
function isBackendStatus(status: unknown): status is BackendStatus {
  return (
    typeof status === "string" &&
    (BACKEND_STATUSES as readonly string[]).includes(status)
  );
}

// Type guard for FrontendStatus
function isFrontendStatus(status: unknown): status is FrontendStatus {
  return (
    typeof status === "string" &&
    (FRONTEND_STATUSES as readonly string[]).includes(status as string)
  );
}

// Query: Get all documents
export const useDocumentsQuery = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: async () => {
      const documents = await documentService.getDocuments();
      return documents.map(adaptApiDocumentToUI);
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - documents don't change often
  });
};

// Query: Get single document
export const useDocumentQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.document(id),
    queryFn: async () => {
      const document = await documentService.getDocument(id);
      return adaptApiDocumentToUI(document);
    },
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Helper function to update document status in the cache
const updateDocumentStatus = (
  queryClient: QueryClient,
  documentId: string,
  status: DocumentStatusResponse | { status: BackendStatus | FrontendStatus }
) => {
  queryClient.setQueryData<Document>(queryKeys.document(documentId), (old) => {
    if (!old) return old;

    // Determine the new status based on the input
    let newStatus: FrontendStatus;
    if (isBackendStatus(status.status)) {
      newStatus = mapApiStatusToUIStatus(status.status);
    } else if (isFrontendStatus(status.status)) {
      newStatus = status.status;
    } else {
      console.warn("Unknown status type:", status.status);
      newStatus = "error";
    }

    return {
      ...old,
      status: newStatus,
    };
  });
};

// Query: Get document status (with polling for processing documents)
export const useDocumentStatusQuery = (id: string, enabled = true) => {
  const queryClient = useQueryClient();

  const queryFn = useCallback(async () => {
    if (!id) return null;
    const status = await documentService.getDocumentStatus(id);
    updateDocumentStatus(queryClient, id, status);
    return status;
  }, [id, queryClient]);

  return useQuery({
    queryKey: queryKeys.documentStatus(id),
    queryFn,
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      // Poll every 2 seconds if document is still processing
      const data = query.state.data as DocumentStatusResponse | undefined;

      if (!data?.status) {
        console.log(`ℹ️ No status data, stopping polling`);
        return false;
      }

      // Continue polling for these statuses (non-terminal states)
      const processingStates = [
        "uploaded",
        "pending",
        "processing",
        "chunking",
        "vectorizing",
        "indexing",
      ];

      // Stop polling for these statuses (terminal states)
      const terminalStates = [
        "ready",
        "completed",
        "processed",
        "error",
        "failed",
      ];

      if (processingStates.includes(data.status)) {
        console.log(`🔄 Polling document status (${data.status})`);
        return 2000; // Poll every 2 seconds
      }

      if (terminalStates.includes(data.status)) {
        console.log(`🛑 Stopping polling for terminal status: ${data.status}`);

        // Only invalidate queries once when reaching terminal state
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.documents });
          queryClient.invalidateQueries({ queryKey: queryKeys.document(id) });
        }, 100);

        // Show success message if processing is complete
        if (["processed", "completed", "ready"].includes(data.status)) {
          toast.success("Document processing completed!");
        }

        return false; // Stop polling
      }

      // For any unknown status, stop polling to prevent infinite loops
      console.log(
        `⚠️ Unknown status '${data.status}', stopping polling to prevent infinite loop`
      );
      return false;
    },
    staleTime: 0, // Always consider status data stale for real-time updates
  });
};

// Helper function to map API status to UI status
const mapApiStatusToUIStatus = (status: BackendStatus): FrontendStatus => {
  switch (status) {
    case "uploaded":
    case "pending":
      return "uploading";
    case "processing":
    case "chunking":
    case "vectorizing":
    case "indexing":
      return "processing";
    case "completed":
    case "processed":
      return "ready";
    case "error":
      return "error";
    default: {
      // This will cause a TypeScript error if we've missed any BackendStatus cases
      console.warn("Unhandled document status:", status);
      return "error" as const;
    }
  }
};

// Query: Get document content
export const useDocumentContentQuery = (id: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.documentContent(id),
    queryFn: () => documentService.getDocumentContent(id),
    enabled: !!id && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - content doesn't change
  });
};

// Mutation: Upload document
export const useUploadDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.uploadDocument,
    mutationFn: async (file: File) => {
      return await documentService.uploadDocument(file);
    },
    onSuccess: async (data) => {
      // Invalidate documents list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });

      // Add the new document to cache optimistically
      const newDocument: UIDocument = {
        id: data.document_id,
        name: data.filename,
        size: 0, // Will be updated when full document is fetched
        uploadedAt: new Date(),
        status: "processing",
        totalPages: 0,
        url: "",
      };

      queryClient.setQueryData(
        queryKeys.document(data.document_id),
        newDocument
      );

      toast.success("Document uploaded successfully!");

      // Automatically start ASYNC document processing after upload (NEW - no more timeouts!)
      try {
        console.log(
          "🚀 Starting ASYNC document processing for:",
          data.document_id
        );

        // Start async processing - this returns immediately with job info
        const asyncJob = await documentService.startAsyncProcessing(
          data.document_id,
          true
        );
        console.log("✅ Async processing job started:", {
          jobId: asyncJob.job_id,
          documentId: asyncJob.document_id,
          status: asyncJob.status,
          statusUrl: asyncJob.status_url,
          websocketUrl: asyncJob.websocket_url,
        });

        // Show immediate feedback that processing has started
        toast.success("Document processing started in background!");

        // Update document status to show it's processing
        queryClient.setQueryData<UIDocument>(
          queryKeys.document(data.document_id),
          (old) => (old ? { ...old, status: "processing" } : old)
        );

        // Start polling the ASYNC JOB STATUS (not just document status) to detect completion/failure
        const pollAsyncJobStatus = async () => {
          let attempts = 0;
          const maxAttempts = 150; // 5 minutes max (2s intervals)

          const poll = async (): Promise<void> => {
            attempts++;

            try {
              // Poll the async job status endpoint
              const jobStatus = await documentService.getAsyncProcessingStatus(
                data.document_id,
                asyncJob.job_id
              );

              // Check if job completed successfully
              if (jobStatus.status === "completed") {
                console.log("✅ Async processing completed successfully!");

                // Update document status to 'ready' to stop the spinner
                queryClient.setQueryData<UIDocument>(
                  queryKeys.document(data.document_id),
                  (old) => (old ? { ...old, status: "ready" } : old)
                );

                // Invalidate queries to refresh data
                queryClient.invalidateQueries({
                  queryKey: queryKeys.documents,
                });
                queryClient.invalidateQueries({
                  queryKey: queryKeys.document(data.document_id),
                });

                toast.success("Document processing completed successfully!");
                return; // Stop polling
              } else if (jobStatus.status === "failed") {
                // Update document status to 'error' to stop the spinner
                queryClient.setQueryData<UIDocument>(
                  queryKeys.document(data.document_id),
                  (old) => (old ? { ...old, status: "error" } : old)
                );

                toast.error(
                  `Document processing failed: ${
                    jobStatus.error_message || "Unknown error"
                  }`
                );
                return; // Stop polling
              } else if (attempts >= maxAttempts) {
                console.warn(
                  "⏰ Async job polling timeout - stopping polling but job may still be running"
                );

                // Update document status to 'error' to stop the spinner
                queryClient.setQueryData<UIDocument>(
                  queryKeys.document(data.document_id),
                  (old) => (old ? { ...old, status: "error" } : old)
                );

                toast.error("Document processing timed out - please try again");
                return; // Stop polling
              }

              // Continue polling if job is still in progress
              setTimeout(poll, 2000); // Poll every 2 seconds
            } catch (error) {
              console.error("❌ Error polling async job status:", error);

              if (attempts >= maxAttempts) {
                // Update document status to 'error' to stop the spinner
                queryClient.setQueryData<UIDocument>(
                  queryKeys.document(data.document_id),
                  (old) => (old ? { ...old, status: "error" } : old)
                );

                toast.error("Failed to monitor document processing");
                return; // Stop polling
              }

              // Retry polling
              setTimeout(poll, 2000);
            }
          };

          // Start polling
          poll();
        };

        // Start async job status polling
        pollAsyncJobStatus();

        console.log(
          "📊 Async job status polling started - will monitor completion/failure"
        );
      } catch (error) {
        console.error("❌ Failed to start async document processing:", error);
        toast.error("Failed to start document processing");

        // Update the document status to error
        queryClient.setQueryData<UIDocument>(
          queryKeys.document(data.document_id),
          (old) => (old ? { ...old, status: "error" } : old)
        );
      }
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
};

// Mutation: Delete document
export const useDeleteDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteDocument,
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onMutate: async (deletedId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.documents });

      // Snapshot previous value
      const previousDocuments = queryClient.getQueryData<UIDocument[]>(
        queryKeys.documents
      );

      // Optimistically update documents list
      if (previousDocuments) {
        queryClient.setQueryData<UIDocument[]>(
          queryKeys.documents,
          previousDocuments.filter((doc) => doc.id !== deletedId)
        );
      }

      // Remove individual document from cache
      queryClient.removeQueries({ queryKey: queryKeys.document(deletedId) });

      return { previousDocuments };
    },
    onError: (error, _deletedId, context) => {
      // Rollback on error
      if (context?.previousDocuments) {
        queryClient.setQueryData(
          queryKeys.documents,
          context.previousDocuments
        );
      }
      toast.error(getErrorDisplayMessage(error));
    },
    onSuccess: () => {
      toast.success("Document deleted successfully");
    },
    onSettled: () => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: queryKeys.documents });
    },
  });
};

import { useMemo } from "react";

// Custom hook combining document and status queries with optimized re-renders
export const useDocumentWithStatus = (id: string) => {
  // Document query with basic options
  const documentQuery = useDocumentQuery(id);

  // Only enable status query if we have a valid ID and document is not in terminal state
  const shouldPollStatus = useMemo(() => {
    if (!id || !documentQuery.data) return false;

    // Check frontend status for terminal states (mapped from backend)
    const frontendTerminalStates = ["ready", "error"];
    const isTerminalState = frontendTerminalStates.includes(
      documentQuery.data.status
    );

    console.log("📊 Polling decision:", {
      documentId: id,
      currentStatus: documentQuery.data.status,
      isTerminalState,
      shouldPoll: !isTerminalState,
    });

    // Stop polling if document is in terminal state
    return !isTerminalState;
  }, [id, documentQuery.data]); // Include full data object to satisfy ESLint

  // Status query with conditional enabling
  const statusQuery = useDocumentStatusQuery(id, shouldPollStatus);

  // Destructure all needed values from queries
  const {
    data: documentData,
    isLoading: isDocumentLoading,
    error: documentError,
    refetch: refetchDocument,
  } = documentQuery;

  const {
    data: statusData,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = statusQuery;

  // Memoize the combined result with all dependencies
  return useMemo(
    () => ({
      document: documentData,
      status: statusData,
      isLoading: isDocumentLoading || (shouldPollStatus && isStatusLoading),
      error: documentError || statusError,
      refetch: () => {
        refetchDocument();
        if (shouldPollStatus) {
          refetchStatus();
        }
      },
    }),
    [
      // Document query values
      documentData,
      isDocumentLoading,
      documentError,
      refetchDocument,

      // Status query values
      statusData,
      isStatusLoading,
      statusError,
      refetchStatus,

      // Derived state
      shouldPollStatus,
    ]
  );
};
