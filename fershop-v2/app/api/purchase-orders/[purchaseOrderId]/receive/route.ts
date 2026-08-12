import { NextResponse } from "next/server";

import {
  getInventoryStoreError,
  receivePurchaseOrder,
} from "@/lib/server/inventory-store";

interface ReceivePurchaseOrderRouteProps {
  params: Promise<{ purchaseOrderId: string }>;
}

export async function POST(
  _request: Request,
  { params }: ReceivePurchaseOrderRouteProps
) {
  try {
    const { purchaseOrderId } = await params;
    const purchaseOrder = await receivePurchaseOrder(purchaseOrderId);
    return NextResponse.json({ purchaseOrder });
  } catch (error) {
    const failure = getInventoryStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
