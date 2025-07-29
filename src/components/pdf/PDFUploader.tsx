import React, { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload } from "lucide-react";
import { Button } from "../ui/Button";
import type { PDFUploaderProps } from "../../types";
import { validateFile } from "../../utils/helpers";
import { UI_MESSAGES } from "../../utils/constants";
import { cn } from "../../utils/cn";

const PDFUploader: React.FC<PDFUploaderProps> = ({
  onFileUpload,
  isUploading,
  progress,
}) => {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        // Show specific error message based on rejection reason
        const firstRejection = rejectedFiles[0];
        const errorCode = firstRejection.errors[0]?.code;
        let errorMessage = "Please select a valid PDF file";

        if (errorCode === "file-too-large") {
          errorMessage = `File is too large. Size: ${(
            firstRejection.file.size /
            (1024 * 1024)
          ).toFixed(1)}MB`;
        } else if (errorCode === "file-invalid-type") {
          errorMessage = "Please upload a PDF file only";
        }

        setError(errorMessage);
        return;
      }

      if (acceptedFiles.length === 0) {
        return;
      }

      const file = acceptedFiles[0];
      const validation = validateFile(file);

      if (!validation.isValid) {
        setError(validation.error || "Invalid file");
        return;
      }

      onFileUpload(file);
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
    disabled: isUploading,
    noClick: false,
    noKeyboard: false,
    maxSize: undefined, // Remove size limit entirely
  });

  const getStatusMessage = () => {
    if (error) return error;
    if (progress?.status === "uploading")
      return `${UI_MESSAGES.UPLOAD.UPLOADING} ${progress.percentage}%`;
    if (progress?.status === "processing") return UI_MESSAGES.UPLOAD.PROCESSING;
    if (progress?.status === "complete") return UI_MESSAGES.UPLOAD.SUCCESS;
    if (progress?.status === "error")
      return progress.message || UI_MESSAGES.UPLOAD.ERROR;
    return UI_MESSAGES.UPLOAD.DRAG_DROP;
  };

  const getStatusColor = () => {
    if (error || progress?.status === "error") return "text-red-600";
    if (progress?.status === "complete") return "text-green-600";
    if (progress?.status === "uploading" || progress?.status === "processing")
      return "text-purple-600";
    return "text-gray-600";
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 p-8">
      <div className="w-full max-w-2xl">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg transition-colors cursor-pointer",
            "flex flex-col items-center justify-center text-center",
            "min-h-[400px] p-12",
            isDragActive
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />

          {/* Upload Icon */}
          <div className="mb-4">
            <Upload className="mx-auto h-12 w-12 text-blue-400" />
          </div>

          {/* Upload Text */}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload PDF to start chatting
          </h3>

          <p className={cn("text-sm mb-4", getStatusColor())}>
            {getStatusMessage()}
          </p>

          {/* Progress Bar */}
          {progress && progress.status === "uploading" && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          )}

          {!isUploading && (
            <Button variant="primary" size="sm">
              Choose File
            </Button>
          )}
        </div>

        {/* File Requirements */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>Supported format: PDF</p>
        </div>
      </div>
    </div>
  );
};

export default PDFUploader;
