import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { hasDatabaseConfiguration } from "@/lib/db";
import { saveCourierInvoice } from "@/lib/server/asset-store";
import type { CourierInvoiceFile } from "@/lib/types";

export const COURIER_INVOICE_MAX_BYTES = 10 * 1024 * 1024;

function cleanFileName(fileName: string) {
  return fileName.replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_").slice(0, 240) || "factura-courier.pdf";
}

export async function readAndValidateCourierPdf(file: File) {
  if (file.size <= 0) {
    throw new Error("El PDF esta vacio.");
  }
  if (file.size > COURIER_INVOICE_MAX_BYTES) {
    throw new Error("El PDF no puede superar 10 MB.");
  }
  if (file.type && file.type !== "application/pdf") {
    throw new Error("Selecciona un archivo PDF.");
  }
  const data = Buffer.from(await file.arrayBuffer());
  if (data.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("El archivo seleccionado no es un PDF valido.");
  }
  return data;
}

export async function saveCourierPdf(file: File, data: Buffer): Promise<CourierInvoiceFile> {
  const fileName = cleanFileName(file.name);
  if (hasDatabaseConfiguration()) {
    const id = await saveCourierInvoice({ data, fileName, mimeType: "application/pdf" });
    if (!id) {
      throw new Error("No se genero el identificador del PDF.");
    }
    return {
      id,
      fileName,
      mimeType: "application/pdf",
      url: `/api/courier-invoices/files/${id}`,
    };
  }

  const id = randomUUID();
  const storageFileName = `${id}.pdf`;
  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "courier-invoices");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, storageFileName), data);
  return {
    id,
    fileName,
    mimeType: "application/pdf",
    url: `/uploads/courier-invoices/${storageFileName}`,
  };
}
