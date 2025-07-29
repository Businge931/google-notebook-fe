import React, { useReducer, type ReactNode } from "react";
import {
  AppContext,
  type AppState,
  type AppAction,
} from "./AppContextDefinition";
import { generateId } from "../utils/helpers";

const initialState: AppState = {
  currentDocument: null,
  uploadProgress: {
    percentage: 0,
    status: "idle",
  },
  chatSession: null,
  pdfViewerState: {
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    isLoading: false,
  },
  isLoading: false,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_DOCUMENT":
      return {
        ...state,
        currentDocument: action.payload,
        chatSession: {
          id: generateId(),
          documentId: action.payload.id,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        pdfViewerState: {
          ...state.pdfViewerState,
          totalPages: action.payload.totalPages || 0,
          currentPage: 1,
        },
      };

    case "SET_UPLOAD_PROGRESS":
      return {
        ...state,
        uploadProgress: action.payload,
      };

    case "ADD_MESSAGE":
      if (!state.chatSession) return state;
      return {
        ...state,
        chatSession: {
          ...state.chatSession,
          messages: [...state.chatSession.messages, action.payload],
          updatedAt: new Date(),
        },
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "SET_PDF_PAGE":
      return {
        ...state,
        pdfViewerState: {
          ...state.pdfViewerState,
          currentPage: action.payload,
        },
      };

    case "SET_PDF_SCALE":
      return {
        ...state,
        pdfViewerState: {
          ...state.pdfViewerState,
          scale: action.payload,
        },
      };

    case "RESET_STATE":
      return initialState;

    default:
      return state;
  }
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
