import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { hasDatabaseConfiguration } from "@/lib/db";
import { saveProductImage } from "@/lib/server/asset-store";

export const runtime = "nodejs";

const maxImageBytes = 8 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ message: "Selecciona una imagen." }, { status: 400 });
    }
    const extension = allowedTypes[image.type];
    if (!extension) {
      return NextResponse.json(
        { message: "La imagen debe ser JPG, PNG o WebP." },
        { status: 400 }
      );
    }
    if (image.size <= 0 || image.size > maxImageBytes) {
      return NextResponse.json(
        { message: "La imagen debe pesar menos de 8 MB." },
        { status: 400 }
      );
    }

    const fileName = `${randomUUID()}.${extension}`;
    const data = Buffer.from(await image.arrayBuffer());
    if (hasDatabaseConfiguration()) {
      const imageId = await saveProductImage({ data, fileName, mimeType: image.type });
      return NextResponse.json(
        { imageUrl: `/api/products/images/${imageId}` },
        { status: 201 }
      );
    }
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, fileName), data);
    return NextResponse.json({ imageUrl: `/uploads/products/${fileName}` }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "No pudimos guardar la imagen." }, { status: 500 });
  }
}
