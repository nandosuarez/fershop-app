import { NextResponse } from "next/server";

import { deleteExpense, getExpenseStoreError } from "@/lib/server/expense-store";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ expenseId: string }> }
) {
  try {
    const { expenseId } = await context.params;
    await deleteExpense(expenseId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const failure = getExpenseStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
