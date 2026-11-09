import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { hasDatabaseConfiguration } from "@/lib/db";
import {
  getFileExtension,
  getOrderAttachmentFileError,
  isOrderAttachmentImage,
  ORDER_ATTACHMENT_MAX_FILES,
  ORDER_ATTACHMENT_MAX_TOTAL_BYTES,
} from "@/lib/order-attachments";
import { saveOrderAttachment } from "@/lib/server/asset-store";
import type { OrderAttachment } from "@/lib/types";

export const runtime = "nodejs";

const mimeTypeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
};

const extensionByMimeType = Object.fromEntries(
  Object.entries(mimeTypeByExtension).map(([extension, mimeType]) => [mimeType, extension])
) as Record<string, string>;
extensionByMimeType["image/jpeg"] = "jpg";

function cleanFileName(fileName: string) {
  return fileName.replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_").slice(0, 240) || "archivo";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
    if (!files.length) {
      return NextResponse.json({ message: "Selecciona al menos un archivo." }, { status: 400 });
    }
    if (files.length > ORDER_ATTACHMENT_MAX_FILES) {
      return NextResponse.json(
        { message: `Puedes adjuntar hasta ${ORDER_ATTACHMENT_MAX_FILES} archivos.` },
        { status: 400 }
      );
    }
    if (files.reduce((sum, file) => sum + file.size, 0) > ORDER_ATTACHMENT_MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { message: "Los archivos juntos no pueden superar 36 MB." },
        { status: 400 }
      );
    }

    const attachments: OrderAttachment[] = [];
    for (const file of files) {
      const validationError = getOrderAttachmentFileError(file);
      if (validationError) {
        return NextResponse.json({ message: validationError }, { status: 400 });
      }

      const originalExtension = getFileExtension(file.name);
      const extension =
        extensionByMimeType[file.type] ||
        (originalExtension === "jpeg" ? "jpg" : originalExtension);
      const mimeType = file.type || mimeTypeByExtension[originalExtension];
      const id = randomUUID();
      const storageFileName = `${id}.${extension}`;
      const data = Buffer.from(await file.arrayBuffer());
      let attachmentId: string = id;
      let url = `/uploads/orders/${storageFileName}`;

      if (hasDatabaseConfiguration()) {
        const savedId = await saveOrderAttachment({
          data,
          fileName: cleanFileName(file.name),
          mimeType,
        });
        if (!savedId) {
          throw new Error("No se genero el identificador del archivo.");
        }
        attachmentId = savedId;
        url = `/api/orders/attachments/${savedId}`;
      } else {
        const uploadDirectory = path.join(process.cwd(), "public", "uploads", "orders");
        await mkdir(uploadDirectory, { recursive: true });
        await writeFile(path.join(uploadDirectory, storageFileName), data);
      }

      attachments.push({
        id: attachmentId,
        fileName: cleanFileName(file.name),
        mimeType,
        url,
        kind: isOrderAttachmentImage(mimeType) ? "image" : "document",
      });
    }

    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    console.error("Error saving order attachments", error);
    return NextResponse.json(
      { message: "No pudimos guardar los archivos del pedido." },
      { status: 500 }
    );
  }
}
