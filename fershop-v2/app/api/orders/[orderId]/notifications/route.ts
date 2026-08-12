import { NextResponse } from "next/server";

import { getOperationsErrorMessage, markOrderNotified } from "@/lib/server/operations-store";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const result = await markOrderNotified(orderId);
    return NextResponse.json(result);
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
