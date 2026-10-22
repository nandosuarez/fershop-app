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

export type QuotePurchaseType = "online" | "travel";

export interface QuoteLineItemInput {
  productName: string;
  quantity: number;
  unitPriceUsdNet: number;
  unitTaxUsaPercent: number;
  unitLockerShippingUsd: number;
}

export interface AdvancedQuoteInput {
  purchaseType: QuotePurchaseType;
  quantity?: number;
  priceUsdNet: number;
  taxUsaPercent: number;
  travelCostUsd: number;
  lockerShippingUsd: number;
  exchangeRateCop: number;
  localCostsCop: number;
  desiredMarginPercent: number;
  advancePercent: number;
  finalSalePriceCop?: number;
  finalAdvanceCop?: number;
  lineItems?: QuoteLineItemInput[];
}

function ensureFinite(value: number, fieldName: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} debe ser numerico.`);
  }
}

function ensureNonNegative(value: number, fieldName: string) {
  ensureFinite(value, fieldName);
  if (value < 0) {
    throw new Error(`${fieldName} no puede ser negativo.`);
  }
}

function safeDivide(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

function validateAdvancedQuote(input: AdvancedQuoteInput) {
  if (input.purchaseType !== "online" && input.purchaseType !== "travel") {
    throw new Error("El tipo de compra debe ser online o viaje.");
  }

  const nonNegativeValues: Array<[number, string]> = [
    [input.priceUsdNet, "El precio USD"],
    [input.taxUsaPercent, "El impuesto USA"],
    [input.travelCostUsd, "El costo de viaje"],
    [input.lockerShippingUsd, "El envio de casillero"],
    [input.exchangeRateCop, "La TRM"],
    [input.localCostsCop, "Los gastos locales"],
    [input.desiredMarginPercent, "El margen deseado"],
    [input.advancePercent, "El anticipo"],
  ];
  nonNegativeValues.forEach(([value, fieldName]) => ensureNonNegative(value, fieldName));

  if (input.exchangeRateCop <= 0) {
    throw new Error("La TRM debe ser mayor que cero.");
  }
  if (input.desiredMarginPercent >= 100) {
    throw new Error("El margen deseado debe ser menor al 100%.");
  }
  if (input.advancePercent > 100) {
    throw new Error("El anticipo no puede superar el 100%.");
  }
  if (input.finalSalePriceCop !== undefined) {
    ensureFinite(input.finalSalePriceCop, "El precio final");
    if (input.finalSalePriceCop <= 0) {
      throw new Error("El precio final debe ser mayor que cero.");
    }
  }
  if (input.finalAdvanceCop !== undefined) {
    ensureNonNegative(input.finalAdvanceCop, "El anticipo final");
  }

  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("La cantidad debe ser un entero mayor que cero.");
  }

  input.lineItems?.forEach((item) => {
    if (!item.productName.trim()) {
      throw new Error("Cada producto debe tener un nombre.");
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("La cantidad de cada producto debe ser un entero mayor que cero.");
    }
    ensureNonNegative(item.unitPriceUsdNet, "El precio unitario USD");
    ensureNonNegative(item.unitTaxUsaPercent, "El impuesto unitario");
    ensureNonNegative(item.unitLockerShippingUsd, "El envio unitario");
  });
}

export function calculateAdvancedQuote(input: AdvancedQuoteInput) {
  validateAdvancedQuote(input);

  const lineItems: QuoteLineItemInput[] = input.lineItems?.length
    ? input.lineItems
    : [
        {
          productName: "Producto",
          quantity: input.quantity ?? 1,
          unitPriceUsdNet: input.priceUsdNet,
          unitTaxUsaPercent: input.taxUsaPercent,
          unitLockerShippingUsd: input.lockerShippingUsd,
        },
      ];

  let totalPriceWithTaxUsd = 0;
  let totalLockerShippingUsd = 0;
  let totalCostBasisCop = 0;

  const calculatedLineItems = lineItems.map((item) => {
    const priceUsdNet = item.unitPriceUsdNet * item.quantity;
    const taxUsd = priceUsdNet * (item.unitTaxUsaPercent / 100);
    const priceWithTaxUsd = priceUsdNet + taxUsd;
    const lockerShippingUsd = item.unitLockerShippingUsd * item.quantity;
    const costBasisUsd = priceWithTaxUsd + lockerShippingUsd;
    const costBasisCop = costBasisUsd * input.exchangeRateCop;

    totalPriceWithTaxUsd += priceWithTaxUsd;
    totalLockerShippingUsd += lockerShippingUsd;
    totalCostBasisCop += costBasisCop;

    return {
      ...item,
      priceUsdNet,
      taxUsd,
      priceWithTaxUsd,
      lockerShippingUsd,
      costBasisUsd,
      costBasisCop,
    };
  });

  const appliedTravelCostUsd = input.purchaseType === "travel" ? input.travelCostUsd : 0;
  const appliedLocalCostsCop = input.purchaseType === "travel" ? input.localCostsCop : 0;
  const totalUsd = totalPriceWithTaxUsd + appliedTravelCostUsd + totalLockerShippingUsd;
  const travelCostCop = appliedTravelCostUsd * input.exchangeRateCop;
  const lockerShippingCop = totalLockerShippingUsd * input.exchangeRateCop;
  const costInCop = totalUsd * input.exchangeRateCop;
  const realTotalCostCop = costInCop + appliedLocalCostsCop;
  const desiredMarginRate = input.desiredMarginPercent / 100;
  const advanceRate = input.advancePercent / 100;
  const suggestedSalePriceCop = realTotalCostCop / (1 - desiredMarginRate);
  const suggestedProfitCop = suggestedSalePriceCop - realTotalCostCop;
  const suggestedAdvanceCop = suggestedSalePriceCop * advanceRate;
  const suggestedOwnCapitalCop = realTotalCostCop - suggestedAdvanceCop;
  const finalSalePriceCop = input.finalSalePriceCop ?? suggestedSalePriceCop;
  const finalAdvanceCop = input.finalAdvanceCop ?? finalSalePriceCop * advanceRate;
  const finalProfitCop = finalSalePriceCop - realTotalCostCop;
  const finalOwnCapitalCop = realTotalCostCop - finalAdvanceCop;

  return {
    costs: {
      purchaseType: input.purchaseType,
      priceWithTaxUsd: totalPriceWithTaxUsd,
      appliedTravelCostUsd,
      appliedLockerShippingUsd: totalLockerShippingUsd,
      appliedLocalCostsCop,
      travelCostCop,
      lockerShippingCop,
      totalUsd,
      costInCop,
      realTotalCostCop,
    },
    suggested: {
      salePriceCop: suggestedSalePriceCop,
      profitCop: suggestedProfitCop,
      advanceCop: suggestedAdvanceCop,
      ownCapitalCop: suggestedOwnCapitalCop,
      ownCapitalPercent: safeDivide(suggestedOwnCapitalCop, realTotalCostCop),
      markupPercent: safeDivide(suggestedProfitCop, realTotalCostCop),
      roiPercent: safeDivide(suggestedProfitCop, suggestedOwnCapitalCop),
    },
    final: {
      salePriceCop: finalSalePriceCop,
      profitCop: finalProfitCop,
      marginPercent: 1 - realTotalCostCop / finalSalePriceCop,
      advanceCop: finalAdvanceCop,
      advancePercent: safeDivide(finalAdvanceCop, finalSalePriceCop),
      ownCapitalCop: finalOwnCapitalCop,
      ownCapitalPercent: safeDivide(finalOwnCapitalCop, realTotalCostCop),
      markupPercent: safeDivide(finalProfitCop, realTotalCostCop),
      roiPercent: safeDivide(finalProfitCop, finalOwnCapitalCop),
      usesCustomSalePrice: input.finalSalePriceCop !== undefined,
      usesCustomAdvance: input.finalAdvanceCop !== undefined,
    },
    lineItems: calculatedLineItems.map((item) => {
      const shareRatio = safeDivide(item.costBasisCop, totalCostBasisCop) ?? 0;
      return {
        ...item,
        shareRatio,
        realCostCop: realTotalCostCop * shareRatio,
        suggestedSalePriceCop: suggestedSalePriceCop * shareRatio,
        suggestedAdvanceCop: suggestedAdvanceCop * shareRatio,
        suggestedProfitCop: suggestedProfitCop * shareRatio,
        salePriceCop: finalSalePriceCop * shareRatio,
        advanceCop: finalAdvanceCop * shareRatio,
        profitCop: finalProfitCop * shareRatio,
      };
    }),
  };
}
