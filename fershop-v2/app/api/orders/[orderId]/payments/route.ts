import { NextResponse } from "next/server";

import { getOperationsErrorMessage, registerPayment } from "@/lib/server/operations-store";
import type { RegisterPaymentInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const payload = (await request.json()) as Partial<RegisterPaymentInput>;
    const result = await registerPayment(orderId, {
      kind: payload.kind === "balance" ? "balance" : "advance",
      amountCop: Number(payload.amountCop ?? 0),
      note: payload.note,
    });

    return NextResponse.json(result);
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
