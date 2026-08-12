import { NextResponse } from "next/server";

import {
  createPurchaseOrder,
  getInventoryStoreError,
  getPurchaseOrders,
} from "@/lib/server/inventory-store";
import type { CreatePurchaseOrderInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ purchaseOrders: await getPurchaseOrders() });
  } catch (error) {
    const failure = getInventoryStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<CreatePurchaseOrderInput>;
    const purchaseOrder = await createPurchaseOrder({
      supplier: payload.supplier ?? "",
      items: Array.isArray(payload.items)
        ? payload.items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity ?? 0),
            unitCostCop: Number(item.unitCostCop ?? 0),
            unitShippingCostCop: Number(item.unitShippingCostCop ?? 0),
          }))
        : [],
    });
    return NextResponse.json({ purchaseOrder }, { status: 201 });
  } catch (error) {
    const failure = getInventoryStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
