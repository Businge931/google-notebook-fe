export interface Document {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  url?: string;
  totalPages?: number;
  status: "uploading" | "processing" | "ready" | "error" | "processed";
}

export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  citations?: Citation[];
}

export interface Citation {
  id: string;
  page: number;
  text: string;
  documentId: string;
}

export interface ChatSession {
  id: string;
  documentId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadProgress {
  percentage: number;
  status: "idle" | "uploading" | "processing" | "complete" | "error";
  message?: string;
}

export interface PDFViewerState {
  currentPage: number;
  totalPages: number;
  scale: number;
  isLoading: boolean;
}

// UI Component Props
export interface PDFUploaderProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  progress?: UploadProgress;
}

export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onCitationClick: (citation: Citation) => void;
}

export interface PDFViewerProps {
  document: Document | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  onDocumentLoad?: (numPages: number) => void;
}
