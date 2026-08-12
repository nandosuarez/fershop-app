import { NextResponse } from "next/server";

import { createOrder, getOperationsErrorMessage, getOperationsSnapshot } from "@/lib/server/operations-store";
import type { CreateOrderInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getOperationsSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<CreateOrderInput> & {
      productId?: string;
      quantity?: number;
    };
    const items = Array.isArray(payload.items)
      ? payload.items
      : payload.productId
        ? [{ productId: payload.productId, quantity: Number(payload.quantity ?? 1) }]
        : [];
    const result = await createOrder({
      items,
      customerId: payload.customerId,
      customerName: payload.customerName ?? "",
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone ?? "",
      customerAddress: payload.customerAddress,
      customerCity: payload.customerCity ?? "",
      actualInitialPaymentCop: Number(payload.actualInitialPaymentCop ?? 0),
      purchaseWithoutAdvance: Boolean(payload.purchaseWithoutAdvance),
      assignedTo: payload.assignedTo,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
