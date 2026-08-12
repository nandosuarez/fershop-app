import { NextResponse } from "next/server";

import { addOrderComment, getOperationsErrorMessage } from "@/lib/server/operations-store";
import type { AddOrderCommentInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const payload = (await request.json()) as Partial<AddOrderCommentInput>;
    const result = await addOrderComment(orderId, {
      comment: payload.comment ?? "",
      author: payload.author,
    });
    return NextResponse.json(result);
  } catch (error) {
    const failure = getOperationsErrorMessage(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
