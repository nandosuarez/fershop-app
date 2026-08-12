import { NextResponse } from "next/server";

import { createProduct, getProducts, getProductStoreError } from "@/lib/server/product-store";
import type { CreateProductInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ products: await getProducts() });
  } catch (error) {
    const failure = getProductStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<CreateProductInput>;
    const product = await createProduct({
      name: payload.name ?? "",
      imageUrl: payload.imageUrl,
      category: payload.category ?? "sets",
      priceCop: Number(payload.priceCop ?? 0),
      costCop: Number(payload.costCop ?? 0),
      shippingCostCop: Number(payload.shippingCostCop ?? 0),
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    const failure = getProductStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
