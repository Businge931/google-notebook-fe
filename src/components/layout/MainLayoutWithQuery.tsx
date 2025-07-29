import React, { useState, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import PDFUploader from "../pdf/PDFUploader";
import PDFViewer from "../pdf/PDFViewer";
import EnhancedChatInterface from "../chat/EnhancedChatInterface";
import {
  useDocumentsQuery,
  useUploadDocumentMutation,
  useDocumentQuery,
} from "../../hooks/useDocumentQueries";
import { useCreateChatSessionMutation } from "../../hooks/useChatQueries";
import type { UploadProgress } from "../../types";

const MainLayoutWithQuery: React.FC = () => {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    percentage: 0,
    status: "idle",
  });
  const [hasCreatedSession, setHasCreatedSession] = useState(false);

  const documentsQuery = useDocumentsQuery(!currentDocumentId); // Only fetch when no document is selected
  const uploadMutation = useUploadDocumentMutation();
  const createSessionMutation = useCreateChatSessionMutation();

  // Get current document (no polling, just fetch when needed)
  const documentQuery = useDocumentQuery(currentDocumentId || "");
  const currentDocument = documentQuery.data;
  const documentStatus = currentDocument?.status || "idle";

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.includes("pdf")) {
        return;
      }

      setUploadProgress({
        percentage: 0,
        status: "uploading",
        message: "Starting upload...",
      });

      try {
        const result = await uploadMutation.mutateAsync(file);

        // Set the uploaded document as current
        setCurrentDocumentId(result.document_id);

        setUploadProgress({
          percentage: 100,
          status: "complete",
          message: "Upload completed successfully!",
        });
      } catch {
        setUploadProgress({
          percentage: 0,
          status: "error",
          message: "Upload failed. Please try again.",
        });
      }
    },
    [uploadMutation]
  );

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle citation clicks
  const handleCitationClick = useCallback(
    (citation: {
      id: string;
      page: number;
      text: string;
      documentId: string;
    }) => {
      setCurrentPage(citation.page);
    },
    []
  );

  // Handle scale changes
  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);

  // Update upload progress based on document status (simplified)
  React.useEffect(() => {
    // Simple progress tracking based on document status
    if (currentDocument && documentStatus) {
      const progress: UploadProgress = {
        percentage:
          documentStatus === "ready"
            ? 100
            : documentStatus === "processing"
            ? 50
            : 0,
        status:
          documentStatus === "ready"
            ? "complete"
            : documentStatus === "error"
            ? "error"
            : documentStatus === "processing"
            ? "processing"
            : "idle",
        message: documentStatus === "error" ? "Processing failed" : undefined,
      };

      setUploadProgress(progress);
    }
  }, [documentStatus, currentDocumentId, currentDocument]);

  // Stable session creation function to prevent infinite loops
  const createSessionForDocument = React.useCallback(() => {
    if (
      currentDocument &&
      currentDocument.status === "ready" &&
      !hasCreatedSession &&
      !createSessionMutation.data &&
      !createSessionMutation.isPending
    ) {
      setHasCreatedSession(true);
      createSessionMutation.mutate({
        documentId: currentDocument.id,
        sessionName: `Chat with ${currentDocument.name}`,
      });
    }
  }, [currentDocument, hasCreatedSession, createSessionMutation]);

  // Auto-create chat session when document is ready
  React.useEffect(() => {
    createSessionForDocument();
  }, [createSessionForDocument]);

  // Track successful session creation
  React.useEffect(() => {
    if (createSessionMutation.data && createSessionMutation.isSuccess) {
      // Session created successfully - could add success handling here if needed
    }
  }, [createSessionMutation.data, createSessionMutation.isSuccess]);

  // Reset session tracking when document changes
  React.useEffect(() => {
    setHasCreatedSession(false);
    // Reset session state
  }, [currentDocumentId]);

  if (!currentDocumentId || !currentDocument) {
    return (
      <>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-gray-50">
          {/* Document Selection Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl font-bold text-gray-900">
                Google NotebookLM Clone
              </h1>
              <p className="text-gray-600 mt-1">
                Upload a PDF document to start chatting
              </p>
            </div>
          </div>

          {/* Document List */}
          {documentsQuery.data && documentsQuery.data.length > 0 && (
            <div className="max-w-7xl mx-auto p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Documents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {documentsQuery.data.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setCurrentDocumentId(doc.id)}
                  >
                    <h3 className="font-medium text-gray-900 truncate">
                      {doc.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {(doc.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <p className="text-sm text-gray-500">
                      {doc.uploadedAt.toLocaleDateString()}
                    </p>
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                        doc.status === "ready"
                          ? "bg-green-100 text-green-800"
                          : doc.status === "processing"
                          ? "bg-yellow-100 text-yellow-800"
                          : doc.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {doc.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Section */}
          <div className="max-w-2xl mx-auto p-6">
            <PDFUploader
              onFileUpload={handleFileUpload}
              isUploading={uploadMutation.isPending}
              progress={uploadProgress}
            />
          </div>
        </div>
      </>
    );
  }

  // Determine if we should show loading state
  const isLoadingState = ["uploading", "processing"].includes(
    currentDocument.status
  );

  if (isLoadingState) {
    return (
      <>
        <Toaster position="top-right" />
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Document
            </h2>
            <p className="text-gray-600 mb-4">{currentDocument.name}</p>
            <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.percentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {uploadProgress.message || "Processing your document..."}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Main application layout with document loaded
  return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen bg-gray-50">
        {/* Chat Sidebar */}
        <div className="w-1/3 min-w-[400px] max-w-[500px] border-r border-gray-200 bg-white flex-shrink-0">
          <EnhancedChatInterface
            document={currentDocument}
            onCitationClick={handleCitationClick}
            currentSession={createSessionMutation.data}
          />
        </div>

        {/* PDF Viewer */}
        <div className="flex-1">
          <PDFViewer
            document={currentDocument}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            scale={scale}
            onScaleChange={handleScaleChange}
            onDocumentLoad={() => {}}
          />
        </div>
      </div>
    </>
  );
};

export default MainLayoutWithQuery;
