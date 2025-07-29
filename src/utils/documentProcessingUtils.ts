/**
 * Utility functions for document processing status and display
 */

export interface ProcessingResult {
  document_id: string;
  status: string;
  processing_stage: string;
  page_count: number | null;
  chunk_count: number | null;
  processing_time_ms: number | null;
  error_message: string | null;
}

/**
 * Format processing success message with chunk and timing information
 */
export const formatProcessingSuccessMessage = (result: ProcessingResult): string => {
  const chunkInfo = result.chunk_count ? ` (${result.chunk_count} chunks)` : '';
  const timeInfo = result.processing_time_ms 
    ? ` in ${Math.round(result.processing_time_ms / 1000)}s` 
    : '';
  
  return `Document processed successfully${chunkInfo}${timeInfo}`;
};

/**
 * Format processing error message
 */
export const formatProcessingErrorMessage = (result: ProcessingResult): string => {
  return result.error_message || 'Document processing failed';
};

/**
 * Check if processing completed successfully
 */
export const isProcessingComplete = (result: ProcessingResult): boolean => {
  return result.status === 'processed' && result.processing_stage === 'complete';
};

/**
 * Check if processing failed
 */
export const isProcessingFailed = (result: ProcessingResult): boolean => {
  return result.status === 'failed' || !!result.error_message;
};

/**
 * Get processing stage display name
 */
export const getProcessingStageDisplayName = (stage: string): string => {
  const stageNames: Record<string, string> = {
    'upload_complete': 'Upload Complete',
    'text_extraction': 'Extracting Text',
    'parsing_started': 'Parsing Document',
    'chunking': 'Creating Chunks',
    'vectorization': 'Generating Embeddings',
    'indexing': 'Building Index',
    'complete': 'Complete',
    'parsing_failed': 'Parsing Failed',
    'error': 'Error'
  };
  
  return stageNames[stage.toLowerCase()] || stage;
};

/**
 * Get processing progress percentage
 */
export const getProcessingProgress = (stage: string): number => {
  const stageProgress: Record<string, number> = {
    'upload_complete': 10,
    'uploaded': 10,
    'text_extraction': 20,
    'parsing_started': 30,
    'chunking': 50,
    'vectorization': 70,
    'indexing': 85,
    'complete': 100,
    'processed': 100,
    'completed': 100,
    'parsing_failed': 0,
    'error': 0
  };
  
  return stageProgress[stage.toLowerCase()] || 0;
};
