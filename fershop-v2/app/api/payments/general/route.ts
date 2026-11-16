import { NextResponse } from "next/server";

import {
  getOperationsErrorMessage,
  registerGeneralPayment,
} from "@/lib/server/operations-store";
import type { RegisterGeneralPaymentInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<RegisterGeneralPaymentInput>;
    const result = await registerGeneralPayment({
      customerKey: String(payload.customerKey ?? ""),
      orderIds: Array.isArray(payload.orderIds)
        ? payload.orderIds.map((orderId) => String(orderId))
        : [],
      amountCop: Number(payload.amountCop ?? 0),
      note: payload.note,
    });

    return NextResponse.json(result);
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
