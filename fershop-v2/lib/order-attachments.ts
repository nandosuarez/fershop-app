import type { OrderAttachment } from "@/lib/types";

export const ORDER_ATTACHMENT_MAX_FILES = 6;
export const ORDER_ATTACHMENT_MAX_BYTES = 12 * 1024 * 1024;
export const ORDER_ATTACHMENT_MAX_TOTAL_BYTES = 36 * 1024 * 1024;
export const ORDER_ATTACHMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
].join(",");

const allowedExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
]);

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

export function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLocaleLowerCase("en") ?? "";
}

export function isOrderAttachmentImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function getOrderAttachmentFileError(file: File) {
  const extension = getFileExtension(file.name);
  if (!allowedMimeTypes.has(file.type) && !allowedExtensions.has(extension)) {
    return `${file.name}: usa una imagen, PDF, Word, Excel, PowerPoint o TXT.`;
  }
  if (file.size <= 0 || file.size > ORDER_ATTACHMENT_MAX_BYTES) {
    return `${file.name}: cada archivo debe pesar menos de 12 MB.`;
  }
  return null;
}

export function normalizeOrderAttachments(value: unknown): OrderAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return [];
    }
    const entry = candidate as Partial<OrderAttachment>;
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const fileName = typeof entry.fileName === "string" ? entry.fileName.trim() : "";
    const mimeType = typeof entry.mimeType === "string" ? entry.mimeType.trim() : "";
    const url = typeof entry.url === "string" ? entry.url.trim() : "";
    const safeUrl =
      /^\/api\/orders\/attachments\/[0-9a-f-]{36}$/i.test(url) ||
      /^\/uploads\/orders\/[0-9a-f-]{36}\.[a-z0-9]+$/i.test(url);

    if (!id || !fileName || fileName.length > 240 || !mimeType || !safeUrl) {
      return [];
    }

    return [{
      id,
      fileName,
      mimeType,
      url,
      kind: isOrderAttachmentImage(mimeType) ? "image" : "document",
    } satisfies OrderAttachment];
  });
}
