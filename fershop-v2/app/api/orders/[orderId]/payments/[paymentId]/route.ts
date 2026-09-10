import { NextResponse } from "next/server";

import {
  deletePayment,
  getOperationsErrorMessage,
  updatePayment,
} from "@/lib/server/operations-store";
import type { UpdatePaymentInput } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PaymentRouteContext {
  params: Promise<{ orderId: string; paymentId: string }>;
}

export async function PATCH(request: Request, context: PaymentRouteContext) {
  try {
    const { orderId, paymentId } = await context.params;
    const payload = (await request.json()) as Partial<UpdatePaymentInput>;
    const result = await updatePayment(orderId, paymentId, {
      amountCop: Number(payload.amountCop ?? 0),
      note: payload.note,
    });
    return NextResponse.json(result);
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function DELETE(_request: Request, context: PaymentRouteContext) {
  try {
    const { orderId, paymentId } = await context.params;
    const result = await deletePayment(orderId, paymentId);
    return NextResponse.json(result);
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
