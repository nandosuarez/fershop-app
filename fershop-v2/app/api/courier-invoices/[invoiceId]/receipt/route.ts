import { NextResponse } from "next/server";

import {
  getCourierInvoiceSnapshot,
  getCourierInvoiceStoreError,
  markCourierGuidesReceived,
} from "@/lib/server/courier-invoice-store";
import type { MarkCourierGuidesReceivedInput } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await context.params;
    const payload = (await request.json()) as Partial<MarkCourierGuidesReceivedInput>;
    const invoice = await markCourierGuidesReceived(invoiceId, {
      guideIds: Array.isArray(payload.guideIds) ? payload.guideIds : [],
      receivedDate: payload.receivedDate ?? "",
      note: payload.note,
    });
    return NextResponse.json({ invoice, snapshot: await getCourierInvoiceSnapshot() });
  } catch (error) {
    const failure = getCourierInvoiceStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
