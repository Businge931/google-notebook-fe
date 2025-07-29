import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  useDocuments,
  useDocument,
  useDocumentDelete,
  useSearchInDocument,
} from "../hooks/useApiHooks";
import {
  adaptApiDocumentToUI,
  getErrorDisplayMessage,
} from "../utils/typeAdapters";
import type { Document } from "../types";

interface DocumentManagerContainerProps {
  selectedDocumentId?: string;
  onDocumentSelect: (document: Document) => void;
  onDocumentDelete?: (documentId: string) => void;
  children?: React.ReactNode;
}

const DocumentManagerContainer = ({
  selectedDocumentId,
  onDocumentSelect,
  onDocumentDelete,
  children,
}: DocumentManagerContainerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<unknown[]>([]);

  // Documents management hooks
  const documents = useDocuments({
    immediate: true,
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });

  const selectedDocument = useDocument(selectedDocumentId || "", {
    immediate: !!selectedDocumentId,
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });

  const deleteDocument = useDocumentDelete({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      documents.execute(); // Refresh documents list
      onDocumentDelete?.(selectedDocumentId!);
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });

  const searchInDocument = useSearchInDocument(selectedDocumentId || "", {
    onSuccess: (results) => {
      setSearchResults(results as unknown[]);
    },
    onError: (error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });

  // Convert API documents to UI documents
  const uiDocuments = React.useMemo(() => {
    return documents.data?.map(adaptApiDocumentToUI) || [];
  }, [documents.data]);

  const selectedUIDocument = React.useMemo(() => {
    return selectedDocument.data
      ? adaptApiDocumentToUI(selectedDocument.data)
      : null;
  }, [selectedDocument.data]);

  // Handle document selection
  const handleDocumentSelect = useCallback(
    (document: Document) => {
      onDocumentSelect(document);
    },
    [onDocumentSelect]
  );

  // Handle document deletion
  const handleDocumentDelete = useCallback(
    async (documentId: string) => {
      if (window.confirm("Are you sure you want to delete this document?")) {
        await deleteDocument.execute(documentId);
      }
    },
    [deleteDocument]
  );

  // Handle document search
  const handleSearch = useCallback(
    async (query: string) => {
      if (!selectedDocumentId || !query.trim()) {
        setSearchResults([]);
        return;
      }

      setSearchQuery(query);
      await searchInDocument.execute(query);
    },
    [selectedDocumentId, searchInDocument]
  );

  // Refresh documents periodically
  useEffect(() => {
    const interval = setInterval(() => {
      documents.execute();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [documents]);

  return {
    // Documents data
    documents: uiDocuments,
    selectedDocument: selectedUIDocument,
    searchResults,
    searchQuery,

    // Loading states
    isLoadingDocuments: documents.loading,
    isLoadingSelectedDocument: selectedDocument.loading,
    isDeletingDocument: deleteDocument.loading,
    isSearching: searchInDocument.loading,

    // Error states
    documentsError: documents.error,
    selectedDocumentError: selectedDocument.error,
    deleteError: deleteDocument.error,
    searchError: searchInDocument.error,

    // Actions
    refreshDocuments: documents.execute,
    selectDocument: handleDocumentSelect,
    deleteDocument: handleDocumentDelete,
    searchInDocument: handleSearch,
    clearSearch: () => {
      setSearchQuery("");
      setSearchResults([]);
    },

    children,
  };
};

export default DocumentManagerContainer;
