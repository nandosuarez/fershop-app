import { NextResponse } from "next/server";

import {
  getCourierInvoiceSnapshot,
  getCourierInvoiceStoreError,
  registerCourierPayment,
} from "@/lib/server/courier-invoice-store";
import type { RegisterCourierPaymentInput } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await context.params;
    const payload = (await request.json()) as Partial<RegisterCourierPaymentInput>;
    const invoice = await registerCourierPayment(invoiceId, {
      guideIds: Array.isArray(payload.guideIds) ? payload.guideIds : [],
      chargeIds: Array.isArray(payload.chargeIds) ? payload.chargeIds : [],
      paymentCurrency: payload.paymentCurrency === "USD" ? "USD" : "COP",
      amount: Number(payload.amount ?? 0),
      exchangeRateCop: Number(payload.exchangeRateCop ?? 0),
      paymentDate: payload.paymentDate ?? "",
      method: payload.method ?? "",
      reference: payload.reference,
    });
    return NextResponse.json({ invoice, snapshot: await getCourierInvoiceSnapshot() });
  } catch (error) {
    const failure = getCourierInvoiceStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
