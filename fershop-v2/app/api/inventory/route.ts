import { NextResponse } from "next/server";

import { getInventorySnapshot, getInventoryStoreError } from "@/lib/server/inventory-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getInventorySnapshot());
  } catch (error) {
    const failure = getInventoryStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
