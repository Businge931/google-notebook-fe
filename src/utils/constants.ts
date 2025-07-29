export const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
} as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const PDF_VIEWER_CONFIG = {
  DEFAULT_SCALE: 1.0,
  MIN_SCALE: 0.5,
  MAX_SCALE: 3.0,
  SCALE_STEP: 0.25,
} as const;

export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 1000,
  TYPING_DELAY: 100,
} as const;

export const UI_MESSAGES = {
  UPLOAD: {
    DRAG_DROP: "Click or drag and drop your file here",
    UPLOADING: "Uploading PDF...",
    PROCESSING: "Processing document...",
    SUCCESS: "Document ready!",
    ERROR: "Upload failed. Please try again.",
  },
  CHAT: {
    PLACEHOLDER: "Ask about the document...",
    EMPTY_STATE: "Upload a PDF to start chatting",
    THINKING: "Thinking...",
  },
  PDF_VIEWER: {
    LOADING: "Loading PDF...",
    ERROR: "Failed to load PDF",
    NO_DOCUMENT: "No document selected",
  },
} as const;
