import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateAdvancedQuote,
  calculateProductPrice,
} from "../lib/price-calculation.ts";

const closeTo = (actual, expected, tolerance = 1e-8) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

const baseInput = {
  purchaseType: "online",
  priceUsdNet: 75,
  taxUsaPercent: 7,
  travelCostUsd: 0,
  lockerShippingUsd: 9.5,
  exchangeRateCop: 3790,
  localCostsCop: 0,
  desiredMarginPercent: 30,
  advancePercent: 50,
};

test("conserva el caso de referencia de Excel de la V1", () => {
  const result = calculateAdvancedQuote(baseInput);

  closeTo(result.costs.priceWithTaxUsd, 80.25);
  closeTo(result.costs.totalUsd, 89.75);
  closeTo(result.costs.realTotalCostCop, 340152.5);
  closeTo(result.suggested.salePriceCop, 485932.1428571429);
  closeTo(result.suggested.profitCop, 145779.6428571429);
  closeTo(result.suggested.advanceCop, 242966.07142857145);
  closeTo(result.suggested.ownCapitalCop, 97186.42857142855);
  closeTo(result.suggested.markupPercent, 0.4285714285714287);
  closeTo(result.suggested.roiPercent, 1.5000000000000007);
});

test("recalcula el escenario final negociado", () => {
  const result = calculateAdvancedQuote({
    ...baseInput,
    finalSalePriceCop: 490000,
    finalAdvanceCop: 245000,
  });

  closeTo(result.final.marginPercent, 0.3058112244897959);
  closeTo(result.final.advancePercent, 0.5);
  closeTo(result.final.profitCop, 149847.5);
  closeTo(result.final.ownCapitalCop, 95152.5);
  assert.equal(result.final.usesCustomSalePrice, true);
  assert.equal(result.final.usesCustomAdvance, true);
});

test("aplica correctamente compra online y compra en viaje", () => {
  const common = {
    ...baseInput,
    priceUsdNet: 100,
    taxUsaPercent: 10,
    travelCostUsd: 40,
    lockerShippingUsd: 15,
    exchangeRateCop: 4000,
    localCostsCop: 80000,
    desiredMarginPercent: 25,
  };
  const online = calculateAdvancedQuote({ ...common, purchaseType: "online" });
  const travel = calculateAdvancedQuote({ ...common, purchaseType: "travel" });

  closeTo(online.costs.totalUsd, 125);
  closeTo(online.costs.appliedTravelCostUsd, 0);
  closeTo(online.costs.appliedLocalCostsCop, 0);
  closeTo(travel.costs.totalUsd, 165);
  closeTo(travel.costs.appliedLockerShippingUsd, 15);
  closeTo(travel.costs.appliedLocalCostsCop, 80000);
});

test("calcula varios productos y cantidades", () => {
  const result = calculateAdvancedQuote({
    ...baseInput,
    priceUsdNet: 0,
    taxUsaPercent: 0,
    lockerShippingUsd: 0,
    exchangeRateCop: 4000,
    desiredMarginPercent: 25,
    lineItems: [
      {
        productName: "Sueter basico",
        quantity: 3,
        unitPriceUsdNet: 20,
        unitTaxUsaPercent: 7,
        unitLockerShippingUsd: 3,
      },
      {
        productName: "Zapato casual",
        quantity: 1,
        unitPriceUsdNet: 60,
        unitTaxUsaPercent: 8,
        unitLockerShippingUsd: 5,
      },
    ],
  });

  assert.equal(result.lineItems.length, 2);
  closeTo(result.costs.priceWithTaxUsd, 129);
  closeTo(result.costs.appliedLockerShippingUsd, 14);
  closeTo(result.costs.realTotalCostCop, 572000);
  closeTo(result.suggested.salePriceCop, 762666.6666666666);
});

test("rechaza margen negativo y margen del cien por ciento", () => {
  assert.throws(
    () => calculateAdvancedQuote({ ...baseInput, desiredMarginPercent: -1 }),
    /no puede ser negativo/
  );
  assert.throws(
    () => calculateAdvancedQuote({ ...baseInput, desiredMarginPercent: 100 }),
    /menor al 100%/
  );
});

test("mantiene compatible la calculadora basica existente", () => {
  assert.deepEqual(
    calculateProductPrice({
      purchasePriceUsd: 100,
      taxPercent: 7,
      shippingUsd: 8,
      exchangeRateCop: 3800,
      marginPercent: 30,
    }),
    {
      productCostCop: 406600,
      shippingCostCop: 30400,
      totalCostCop: 437000,
      suggestedSalePriceCop: 625000,
    }
  );
});
