import type { ApiError, RequestOptions } from "../types/api";
import { getApiConfig, isDevelopment } from "../utils/apiConfig";
import {
  handleApiError,
  ApiException,
  isRetryableError,
} from "../utils/apiError";

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private enableLogging: boolean;

  constructor() {
    const config = getApiConfig();
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.enableLogging = config.enableLogging;
  }

  private log(message: string, data?: unknown): void {
    if (this.enableLogging && isDevelopment()) {
      console.log(`[API Client] ${message}`, data || "");
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.timeout,
      retries = 3,
      signal,
      ...fetchOptions
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine signals if provided
    const combinedSignal = signal
      ? this.combineSignals([signal, controller.signal])
      : controller.signal;

    // Don't set Content-Type for FormData - let browser handle it
    const isFormData = fetchOptions.body instanceof FormData;
    
    const requestOptions: RequestInit = {
      ...fetchOptions,
      signal: combinedSignal,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...fetchOptions.headers,
      },
    };

    this.log(
      `Making ${fetchOptions.method || "GET"} request to ${url}`,
      requestOptions
    );

    // Additional logging for large file uploads
    if (fetchOptions.body instanceof FormData) {
      console.log("📦 Large file upload detected - starting fetch request...");
      console.log("⏱️ Timeout set to:", timeout, "ms");
    }

    let lastError: ApiException;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1}/${retries + 1} - Calling fetch...`);
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        console.log(`✅ Fetch completed with status: ${response.status}`);
        
        if (fetchOptions.body instanceof FormData) {
          console.log("🎉 Large file upload fetch completed successfully!");
        }

        this.log(`Response ${response.status} from ${url}`);

        if (!response.ok) {
          let errorData: ApiError;
          try {
            errorData = await response.json();
          } catch {
            errorData = {
              error: `HTTP ${response.status}`,
              message: response.statusText || "Request failed",
              type: "HttpError",
            };
          }
          throw new ApiException(errorData, response.status);
        }

        // Handle different content types
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = await response.json();
          this.log(`Success response from ${url}`, data);
          return data;
        } else {
          // For non-JSON responses (like file downloads)
          return response as unknown as T;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = handleApiError(error);

        this.log(`Error on attempt ${attempt + 1}/${retries + 1}:`, lastError);

        // Don't retry on non-retryable errors or if it's the last attempt
        if (!isRetryableError(lastError) || attempt === retries) {
          break;
        }

        // Exponential backoff for retries
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
          this.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener("abort", () => controller.abort());
    }

    return controller.signal;
  }

  // GET request
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: "GET" });
  }

  // POST request
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: "DELETE" });
  }

  // File upload (multipart/form-data)
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<T> {
    console.log("🌐 API Client upload called:", {
      endpoint,
      formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
        key,
        valueType: typeof value,
        fileName: value instanceof File ? value.name : 'N/A',
        fileSize: value instanceof File ? value.size : 'N/A'
      })),
      options
    });

    const { headers, ...restOptions } = options || {};
    
    try {
      console.log("🚀 About to call makeRequest for upload...");
      const result = await this.makeRequest<T>(endpoint, {
        ...restOptions,
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type for FormData - let browser set it with boundary
          ...headers,
        },
      });
      console.log("✅ Upload makeRequest completed successfully");
      return result;
    } catch (error) {
      console.error("❌ Upload makeRequest failed:", error);
      throw error;
    }
  }

  // Download file
  async download(
    endpoint: string,
    options?: RequestOptions
  ): Promise<Response> {
    return this.makeRequest<Response>(endpoint, { ...options, method: "GET" });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      return await this.get("/health");
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
