import { NextResponse } from "next/server";

import { applyOperationalAction, getOperationsErrorMessage } from "@/lib/server/operations-store";
import type { ApplyOperationalActionInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const payload = (await request.json()) as Partial<ApplyOperationalActionInput>;

    if (
      payload.actionType !== "register_purchase" &&
      payload.actionType !== "mark_arrival" &&
      payload.actionType !== "mark_delivery"
    ) {
      return NextResponse.json(
        { message: "La accion operativa enviada no es valida." },
        { status: 400 }
      );
    }

    const result = await applyOperationalAction(orderId, {
      actionType: payload.actionType,
      note: payload.note,
    });

    return NextResponse.json(result);
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
