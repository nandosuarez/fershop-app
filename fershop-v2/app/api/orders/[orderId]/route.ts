import { NextResponse } from "next/server";

import {
  getOperationsErrorMessage,
  getOrder,
  updateOrder,
} from "@/lib/server/operations-store";
import type { UpdateOrderInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const order = await getOrder(orderId);
    return NextResponse.json({ order });
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const payload = (await request.json()) as Partial<UpdateOrderInput>;
    const result = await updateOrder(orderId, {
      items: Array.isArray(payload.items)
        ? payload.items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity ?? 1),
            unitPriceCop: Number(item.unitPriceCop ?? 0),
          }))
        : [],
      customerId: payload.customerId,
      customerName: payload.customerName ?? "",
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone ?? "",
      customerAddress: payload.customerAddress,
      customerCity: payload.customerCity ?? "",
      purchaseWithoutAdvance:
        payload.purchaseWithoutAdvance === undefined
          ? undefined
          : Boolean(payload.purchaseWithoutAdvance),
    });
    return NextResponse.json(result);
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
