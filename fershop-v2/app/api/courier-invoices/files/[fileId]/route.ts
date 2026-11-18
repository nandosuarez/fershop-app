import { NextResponse } from "next/server";

import { getCourierInvoice } from "@/lib/server/asset-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params;
    const file = await getCourierInvoice(fileId);
    if (!file) {
      return NextResponse.json({ message: "Factura no encontrada." }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${file.file_name.replace(/[\r\n"]/g, "_")}"`,
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "No pudimos cargar la factura." }, { status: 500 });
  }
}
