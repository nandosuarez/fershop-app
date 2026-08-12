import { NextResponse } from "next/server";

import {
  createProductCategory,
  getCategoryStoreError,
  getProductCategories,
} from "@/lib/server/category-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ categories: await getProductCategories() });
  } catch (error) {
    const failure = getCategoryStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { label?: string };
    const category = await createProductCategory(payload.label ?? "");
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const failure = getCategoryStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
