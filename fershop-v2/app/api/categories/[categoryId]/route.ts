import { NextResponse } from "next/server";

import {
  deleteProductCategory,
  getCategoryStoreError,
  updateProductCategory,
} from "@/lib/server/category-store";

interface CategoryRouteProps {
  params: Promise<{ categoryId: string }>;
}

export async function PUT(request: Request, { params }: CategoryRouteProps) {
  try {
    const { categoryId } = await params;
    const payload = (await request.json()) as { label?: string };
    const category = await updateProductCategory(categoryId, payload.label ?? "");
    return NextResponse.json({ category });
  } catch (error) {
    const failure = getCategoryStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function DELETE(_request: Request, { params }: CategoryRouteProps) {
  try {
    const { categoryId } = await params;
    await deleteProductCategory(categoryId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const failure = getCategoryStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
