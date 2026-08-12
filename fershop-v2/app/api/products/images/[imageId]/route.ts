import { NextResponse } from "next/server";

import { getProductImage } from "@/lib/server/asset-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await context.params;
    const image = await getProductImage(imageId);
    if (!image) {
      return NextResponse.json({ message: "Imagen no encontrada." }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(image.data), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${image.file_name.replace(/"/g, "")}"`,
        "Content-Type": image.mime_type,
      },
    });
  } catch {
    return NextResponse.json({ message: "No pudimos cargar la imagen." }, { status: 500 });
  }
}
