import { NextResponse } from "next/server";

import { readAndValidateCourierPdf, saveCourierPdf } from "@/lib/server/courier-invoice-file";
import {
  createCourierInvoice,
  getCourierInvoiceSnapshot,
  getCourierInvoiceStoreError,
} from "@/lib/server/courier-invoice-store";
import type { CourierInvoicePreview, CreateCourierInvoiceInput } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ snapshot: await getCourierInvoiceSnapshot() });
  } catch (error) {
    const failure = getCourierInvoiceStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawInvoice = formData.get("invoice");
    if (!(file instanceof File) || typeof rawInvoice !== "string") {
      return NextResponse.json({ message: "Completa los datos y adjunta el PDF." }, { status: 400 });
    }
    const input = JSON.parse(rawInvoice) as Partial<CourierInvoicePreview>;
    const data = await readAndValidateCourierPdf(file);
    const sourceFile = await saveCourierPdf(file, data);
    const invoiceInput: CreateCourierInvoiceInput = {
      courierName: input.courierName ?? "",
      invoiceNumber: input.invoiceNumber ?? "",
      invoiceDate: input.invoiceDate ?? "",
      billedTo: input.billedTo,
      guides: Array.isArray(input.guides) ? input.guides : [],
      charges: Array.isArray(input.charges) ? input.charges : [],
      declaredTotalUsd: Number(input.declaredTotalUsd ?? 0),
      sourceFile,
    };
    const invoice = await createCourierInvoice(invoiceInput);
    return NextResponse.json(
      { invoice, snapshot: await getCourierInvoiceSnapshot() },
      { status: 201 }
    );
  } catch (error) {
    const failure = getCourierInvoiceStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
