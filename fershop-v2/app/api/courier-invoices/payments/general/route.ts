import { NextResponse } from "next/server";

import {
  getCourierInvoiceSnapshot,
  getCourierInvoiceStoreError,
  registerGeneralCourierPayment,
} from "@/lib/server/courier-invoice-store";
import type { RegisterGeneralCourierPaymentInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<RegisterGeneralCourierPaymentInput>;
    const result = await registerGeneralCourierPayment({
      paymentCurrency: payload.paymentCurrency === "USD" ? "USD" : "COP",
      amount: Number(payload.amount ?? 0),
      exchangeRateCop: Number(payload.exchangeRateCop ?? 0),
      paymentDate: payload.paymentDate ?? "",
      method: payload.method ?? "",
      reference: payload.reference,
    });
    return NextResponse.json({
      result,
      snapshot: await getCourierInvoiceSnapshot(),
    });
  } catch (error) {
    const failure = getCourierInvoiceStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
