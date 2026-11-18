import { NextResponse } from "next/server";

import { parseCourierInvoicePdf } from "@/lib/courier-invoice-parser";
import { readAndValidateCourierPdf } from "@/lib/server/courier-invoice-file";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Selecciona la factura PDF." }, { status: 400 });
    }
    const preview = await parseCourierInvoicePdf(await readAndValidateCourierPdf(file));
    return NextResponse.json({ preview });
  } catch (error) {
    console.error("Error reading courier invoice", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No pudimos leer la factura PDF." },
      { status: 400 }
    );
  }
}
