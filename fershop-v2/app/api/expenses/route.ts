import { NextResponse } from "next/server";

import {
  createExpense,
  getExpenseSnapshot,
  getExpenseStoreError,
} from "@/lib/server/expense-store";
import type { CreateExpenseInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ snapshot: await getExpenseSnapshot() });
  } catch (error) {
    const failure = getExpenseStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<CreateExpenseInput>;
    const expense = await createExpense({
      description: payload.description ?? "",
      category: payload.category ?? "other",
      amountCop: Number(payload.amountCop ?? 0),
      paymentSource: payload.paymentSource ?? "general",
      expenseDate: payload.expenseDate ?? "",
      note: payload.note,
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    const failure = getExpenseStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
