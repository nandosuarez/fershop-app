import { NextResponse } from "next/server";

import {
  getProductStoreError,
  updateProduct,
  updateProductPricing,
} from "@/lib/server/product-store";
import type { UpdateProductInput, UpdateProductPricingInput } from "@/lib/types";

interface ProductRouteProps {
  params: Promise<{ productId: string }>;
}

export async function PATCH(request: Request, { params }: ProductRouteProps) {
  try {
    const { productId } = await params;
    const payload = (await request.json()) as Partial<UpdateProductPricingInput>;
    const product = await updateProductPricing(productId, {
      purchasePriceUsd: Number(payload.purchasePriceUsd ?? 0),
      taxPercent: Number(payload.taxPercent ?? 0),
      shippingUsd: Number(payload.shippingUsd ?? 0),
      exchangeRateCop: Number(payload.exchangeRateCop ?? 0),
      marginPercent: Number(payload.marginPercent ?? 0),
      finalSalePriceCop: Number(payload.finalSalePriceCop ?? 0),
    });
    return NextResponse.json({ product });
  } catch (error) {
    const failure = getProductStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}

export async function PUT(request: Request, { params }: ProductRouteProps) {
  try {
    const { productId } = await params;
    const payload = (await request.json()) as Partial<UpdateProductInput>;
    const product = await updateProduct(productId, {
      name: payload.name ?? "",
      imageUrl: payload.imageUrl,
      category: payload.category ?? "sets",
      priceCop: Number(payload.priceCop ?? 0),
      costCop: Number(payload.costCop ?? 0),
      shippingCostCop: Number(payload.shippingCostCop ?? 0),
    });
    return NextResponse.json({ product });
  } catch (error) {
    const failure = getProductStoreError(error);
    return NextResponse.json({ message: failure.message }, { status: failure.status });
  }
}
