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
      category: payload.category ?? "",
      priceCop: Number(payload.priceCop ?? 0),
      costCop: Number(payload.costCop ?? 0),
      shippingCostCop: Number(payload.shippingCostCop ?? 0),
      pricingCalculation: payload.pricingCalculation
        ? {
            purchasePriceUsd: Number(payload.pricingCalculation.purchasePriceUsd ?? 0),
            taxPercent: Number(payload.pricingCalculation.taxPercent ?? 0),
            shippingUsd: Number(payload.pricingCalculation.shippingUsd ?? 0),
            exchangeRateCop: Number(payload.pricingCalculation.exchangeRateCop ?? 0),
            marginPercent: Number(payload.pricingCalculation.marginPercent ?? 0),
          }
        : undefined,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    const failure = getProductStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
