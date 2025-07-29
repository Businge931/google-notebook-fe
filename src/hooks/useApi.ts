import { useState, useCallback, useRef, useEffect } from "react";
import { ApiException } from "../utils/apiError";

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiException | null;
  execute: (...args: unknown[]) => Promise<T | void>;
  reset: () => void;
}

export interface UseApiOptions<T = unknown> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiException) => void;
}

// Generic hook for API calls
export function useApi<T>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiException | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | void> => {
      try {
        // Cancel previous request if still pending
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        // Add abort signal to the last argument if it's an options object
        const lastArg = args[args.length - 1];
        if (lastArg && typeof lastArg === "object" && !Array.isArray(lastArg)) {
          (lastArg as Record<string, unknown>).signal =
            abortControllerRef.current.signal;
        } else {
          args.push({ signal: abortControllerRef.current.signal });
        }

        const result = await apiFunction(...args);

        if (!abortControllerRef.current.signal.aborted) {
          setData(result);
          options.onSuccess?.(result);
          return result;
        }
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          const apiError =
            err instanceof ApiException
              ? err
              : new ApiException({
                  error: "Unknown Error",
                  message:
                    (err as Error).message || "An unexpected error occurred",
                  type: "UnknownError",
                });

          setError(apiError);
          options.onError?.(apiError);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [apiFunction, options]
  );

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, [execute, options.immediate]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

// Hook for file uploads with progress
export interface UseUploadState<T> extends UseApiState<T> {
  progress: number;
}

export function useUpload<T>(
  uploadFunction: (
    file: File,
    onProgress?: (progress: number) => void
  ) => Promise<T>,
  options: UseApiOptions = {}
): UseUploadState<T> {
  const [progress, setProgress] = useState(0);

  const apiState = useApi(
    (...args: unknown[]) => {
      const [file] = args as [File];
      setProgress(0);
      return uploadFunction(file, setProgress);
    },
    {
      ...options,
      onSuccess: (data) => {
        setProgress(100);
        options.onSuccess?.(data);
      },
      onError: (error) => {
        setProgress(0);
        options.onError?.(error);
      },
    }
  );

  const reset = useCallback(() => {
    setProgress(0);
    apiState.reset();
  }, [apiState]);

  return {
    ...apiState,
    progress,
    reset,
  };
}

// Hook for streaming responses (like chat)
export interface UseStreamState {
  content: string;
  loading: boolean;
  error: ApiException | null;
  execute: (...args: unknown[]) => Promise<void>;
  reset: () => void;
}

export function useStream(
  streamFunction: (...args: unknown[]) => Promise<void>,
  options: UseApiOptions = {}
): UseStreamState {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiException | null>(null);

  const execute = useCallback(
    async (...args: unknown[]): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        setContent("");

        await streamFunction(...args);

        options.onSuccess?.(content);
      } catch (err) {
        const apiError =
          err instanceof ApiException
            ? err
            : new ApiException({
                error: "Stream Error",
                message: (err as Error).message || "Streaming failed",
                type: "StreamError",
              });

        setError(apiError);
        options.onError?.(apiError);
      } finally {
        setLoading(false);
      }
    },
    [streamFunction, options, content]
  );

  const reset = useCallback(() => {
    setContent("");
    setLoading(false);
    setError(null);
  }, []);

  return {
    content,
    loading,
    error,
    execute,
    reset,
  };
}

// Hook for polling/refetching data
export interface UsePollingOptions extends UseApiOptions {
  interval?: number;
  enabled?: boolean;
}

export function usePolling<T>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  args: unknown[] = [],
  options: UsePollingOptions = {}
): UseApiState<T> {
  const { interval = 5000, enabled = true, ...apiOptions } = options;
  const intervalRef = useRef<number | null>(null);

  const apiState = useApi(apiFunction, apiOptions);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      apiState.execute(...args);
    }, interval);
  }, [apiState, args, interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      // Initial fetch
      apiState.execute(...args);
      // Start polling
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, startPolling, stopPolling, apiState, args]);

  return {
    ...apiState,
    reset: () => {
      stopPolling();
      apiState.reset();
    },
  };
}
