import type { ApiError } from "../types/api";

export class ApiException extends Error {
  public readonly status: number;
  public readonly type: string;
  public readonly apiError: ApiError;

  constructor(apiError: ApiError, status: number = 500) {
    super(apiError.message || apiError.error);
    this.name = "ApiException";
    this.status = status;
    this.type = apiError.type || "UnknownError";
    this.apiError = apiError;
  }
}

export const handleApiError = (error: unknown): ApiException => {
  // Network or fetch errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new ApiException(
      {
        error: "Network Error",
        message:
          "Unable to connect to the server. Please check your internet connection.",
        type: "NetworkError",
      },
      0
    );
  }

  // Timeout errors
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AbortError"
  ) {
    return new ApiException(
      {
        error: "Request Timeout",
        message: "The request took too long to complete. Please try again.",
        type: "TimeoutError",
      },
      408
    );
  }

  // API response errors
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "data" in error
  ) {
    const apiError = error as { status: number; data: ApiError };
    return new ApiException(apiError.data, apiError.status);
  }

  // Generic errors
  return new ApiException(
    {
      error: "Unknown Error",
      message:
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "An unexpected error occurred.",
      type: "UnknownError",
    },
    500
  );
};

export const getErrorMessage = (error: ApiException): string => {
  switch (error.type) {
    case "NetworkError":
      return "Unable to connect to the server. Please check your internet connection and try again.";
    case "TimeoutError":
      return "The request timed out. Please try again.";
    case "ValidationError":
      return error.message || "Please check your input and try again.";
    case "DocumentError":
      return (
        error.message ||
        "There was an issue with the document. Please try uploading again."
      );
    case "ChatError":
      return (
        error.message || "There was an issue with the chat. Please try again."
      );
    case "CitationError":
      return error.message || "Unable to extract citations. Please try again.";
    case "FileStorageError":
      return "File upload failed. Please try again with a different file.";
    case "ConfigurationError":
      return "Server configuration error. Please contact support.";
    default:
      return error.message || "An unexpected error occurred. Please try again.";
  }
};

export const isRetryableError = (error: ApiException): boolean => {
  // Retry on network errors, timeouts, and 5xx server errors
  return (
    error.type === "NetworkError" ||
    error.type === "TimeoutError" ||
    (error.status >= 500 && error.status < 600)
  );
};
