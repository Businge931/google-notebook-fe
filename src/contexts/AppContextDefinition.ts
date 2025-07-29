import { createContext } from "react";
import type {
  Document,
  ChatMessage,
  ChatSession,
  UploadProgress,
  PDFViewerState,
} from "../types";

export interface AppState {
  currentDocument: Document | null;
  uploadProgress: UploadProgress;
  chatSession: ChatSession | null;
  pdfViewerState: PDFViewerState;
  isLoading: boolean;
}

export type AppAction =
  | { type: "SET_DOCUMENT"; payload: Document }
  | { type: "SET_UPLOAD_PROGRESS"; payload: UploadProgress }
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_PDF_PAGE"; payload: number }
  | { type: "SET_PDF_SCALE"; payload: number }
  | { type: "RESET_STATE" };

export interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}
export const AppContext = createContext<AppContextType | undefined>(undefined);
