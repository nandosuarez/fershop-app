export interface PriceCalculationInput {
  purchasePriceUsd: number;
  taxPercent: number;
  shippingUsd: number;
  exchangeRateCop: number;
  marginPercent: number;
}

export function calculateProductPrice(input: PriceCalculationInput) {
  const purchasePriceUsd = Math.max(0, input.purchasePriceUsd || 0);
  const taxPercent = Math.min(100, Math.max(0, input.taxPercent || 0));
  const shippingUsd = Math.max(0, input.shippingUsd || 0);
  const exchangeRateCop = Math.max(0, input.exchangeRateCop || 0);
  const marginPercent = Math.min(99.9, input.marginPercent || 0);
  const productCostCop = purchasePriceUsd * (1 + taxPercent / 100) * exchangeRateCop;
  const shippingCostCop = shippingUsd * exchangeRateCop;
  const totalCostCop = productCostCop + shippingCostCop;
  const suggestedSalePriceCop =
    marginPercent < 100 ? totalCostCop / (1 - marginPercent / 100) : 0;

  return {
    productCostCop: Math.round(productCostCop),
    shippingCostCop: Math.round(shippingCostCop),
    totalCostCop: Math.round(totalCostCop),
    suggestedSalePriceCop: Math.ceil(suggestedSalePriceCop / 1000) * 1000,
  };
}

export function calculateMarginPercent(totalCostCop: number, salePriceCop: number) {
  if (salePriceCop <= 0 || totalCostCop <= 0) {
    return 0;
  }
  return Number(((1 - totalCostCop / salePriceCop) * 100).toFixed(2));
}
