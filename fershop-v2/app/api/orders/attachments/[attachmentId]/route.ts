import { NextResponse } from "next/server";

import { getOrderAttachment } from "@/lib/server/asset-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const { attachmentId } = await context.params;
    const attachment = await getOrderAttachment(attachmentId);
    if (!attachment) {
      return NextResponse.json({ message: "Archivo no encontrado." }, { status: 404 });
    }
    const inline = attachment.mime_type.startsWith("image/") || attachment.mime_type === "application/pdf";
    const safeFileName = attachment.file_name.replace(/[\r\n"]/g, "_");
    return new NextResponse(new Uint8Array(attachment.data), {
      headers: {
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeFileName}"`,
        "Content-Type": attachment.mime_type,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "No pudimos cargar el archivo." }, { status: 500 });
  }
}
