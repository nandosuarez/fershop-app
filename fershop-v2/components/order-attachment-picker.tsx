"use client";

import { useRef } from "react";

import {
  getOrderAttachmentFileError,
  ORDER_ATTACHMENT_ACCEPT,
  ORDER_ATTACHMENT_MAX_FILES,
  ORDER_ATTACHMENT_MAX_TOTAL_BYTES,
} from "@/lib/order-attachments";
import type { OrderAttachment } from "@/lib/types";

interface ApiErrorPayload {
  message?: string;
}

interface AttachmentUploadPayload {
  attachments: OrderAttachment[];
}

interface OrderAttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(Math.round(bytes / 1024), 1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadOrderAttachments(files: File[]) {
  if (!files.length) {
    return [];
  }
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await fetch("/api/orders/attachments", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const payload = (await response.json()) as ApiErrorPayload;
    throw new Error(payload.message || "No pudimos guardar los archivos.");
  }
  const payload = (await response.json()) as AttachmentUploadPayload;
  return payload.attachments;
}

export function OrderAttachmentPicker({
  files,
  onChange,
  onError,
  disabled = false,
}: OrderAttachmentPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function addFiles(selected: FileList | null) {
    const additions = selected ? Array.from(selected) : [];
    if (!additions.length) {
      return;
    }
    if (files.length + additions.length > ORDER_ATTACHMENT_MAX_FILES) {
      onError(`Puedes adjuntar hasta ${ORDER_ATTACHMENT_MAX_FILES} archivos por comentario.`);
      return;
    }
    for (const file of additions) {
      const validationError = getOrderAttachmentFileError(file);
      if (validationError) {
        onError(validationError);
        return;
      }
    }
    const totalBytes = [...files, ...additions].reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > ORDER_ATTACHMENT_MAX_TOTAL_BYTES) {
      onError("Los archivos juntos no pueden superar 36 MB.");
      return;
    }
    onError("");
    onChange([...files, ...additions]);
  }

  return (
    <div className="order-attachment-picker">
      <div className="order-attachment-actions">
        <button
          type="button"
          className="order-attachment-button"
          disabled={disabled || files.length >= ORDER_ATTACHMENT_MAX_FILES}
          onClick={() => fileInputRef.current?.click()}
        >
          <span aria-hidden="true">+</span> Adjuntar archivo
        </button>
        <button
          type="button"
          className="order-attachment-button"
          disabled={disabled || files.length >= ORDER_ATTACHMENT_MAX_FILES}
          onClick={() => cameraInputRef.current?.click()}
        >
          <span aria-hidden="true" className="order-camera-icon" /> Tomar foto
        </button>
      </div>
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept={ORDER_ATTACHMENT_ACCEPT}
        multiple
        onChange={(event) => {
          addFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => {
          addFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      {files.length ? (
        <div className="order-attachment-selection" aria-label="Archivos seleccionados">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="order-attachment-chip">
              <span className="order-attachment-chip__type">
                {file.type.startsWith("image/") ? "IMG" : "DOC"}
              </span>
              <span className="order-attachment-chip__name">
                <strong>{file.name}</strong>
                <small>{formatFileSize(file.size)}</small>
              </span>
              <button
                type="button"
                aria-label={`Quitar ${file.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
