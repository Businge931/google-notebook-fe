import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFViewerProps } from "../../types";
import { Button } from "../ui/Button";
import { PDF_VIEWER_CONFIG, UI_MESSAGES } from "../../utils/constants";

// Set up PDF.js worker - use local worker file to avoid CDN issues
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const PDFViewer: React.FC<PDFViewerProps> = ({
  document,
  currentPage,
  onPageChange,
  scale,
  onScaleChange,
  onDocumentLoad,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Debug logging for document object
  React.useEffect(() => {
    console.log('📝 PDF Viewer - Document received:', {
      document,
      documentId: document?.id,
      documentUrl: document?.url,
      documentName: document?.name,
      hasDocument: !!document
    });
  }, [document]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log("PDF loaded successfully:", {
      numPages,
      documentUrl: document?.url,
    });
    setNumPages(numPages);
    setError(null);
    if (onDocumentLoad) {
      onDocumentLoad(numPages);
    }
  };

  const onDocumentLoadError = (error: Error) => {
    setError(`Failed to load PDF: ${error.message}`);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    const newScale = Math.min(
      scale + PDF_VIEWER_CONFIG.SCALE_STEP,
      PDF_VIEWER_CONFIG.MAX_SCALE
    );
    onScaleChange(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(
      scale - PDF_VIEWER_CONFIG.SCALE_STEP,
      PDF_VIEWER_CONFIG.MIN_SCALE
    );
    onScaleChange(newScale);
  };

  const handleResetZoom = () => {
    onScaleChange(PDF_VIEWER_CONFIG.DEFAULT_SCALE);
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500">{UI_MESSAGES.PDF_VIEWER.NO_DOCUMENT}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {document.name}
          </h2>
          <span className="text-sm text-gray-500">
            {document.totalPages} pages
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="text-sm text-gray-600 min-w-[80px] text-center">
            {numPages > 0 ? `${currentPage} / ${numPages}` : "--"}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>

          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={handleResetZoom}>
            Reset
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-gray-100">
        <div className="flex justify-center p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <Document
              file={document.url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-gray-600">
                    {UI_MESSAGES.PDF_VIEWER.LOADING}
                  </span>
                </div>
              }
              className="max-w-full"
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                className="shadow-lg"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                }
              />
            </Document>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
