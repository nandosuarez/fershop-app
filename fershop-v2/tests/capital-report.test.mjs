import assert from "node:assert/strict";
import test from "node:test";

import {
  getItemShippingAllocations,
  getOrderFinancialBreakdown,
} from "../lib/capital-report.ts";

function makeOrder({
  totalCop = 728_000,
  paidCop = 0,
  purchased = false,
  items = [
    {
      productId: "product-1",
      productName: "Producto",
      quantity: 1,
      unitPriceCop: 728_000,
      unitCostCop: 500_000,
      unitShippingCostCop: 64_000,
      lineTotalCop: 728_000,
      saleMode: "preorder",
      paymentPolicy: "split_50_50",
    },
  ],
} = {}) {
  return {
    totalCop,
    items,
    inventoryReserved: false,
    purchaseRecordedAtIso: purchased ? "2026-10-30T15:00:00.000Z" : undefined,
    payments:
      paidCop > 0
        ? [
            {
              id: "payment-1",
              kind: "advance",
              statusCode: "received",
              statusLabel: "Recibido",
              amountCop: paidCop,
              recordedAtLabel: "Hoy",
              note: "",
            },
          ]
        : [],
  };
}

test("recauda el envio en la misma proporcion que el pago", () => {
  const breakdown = getOrderFinancialBreakdown(makeOrder({ paidCop: 300_000 }));

  assert.equal(breakdown.paymentRatio, 300_000 / 728_000);
  assert.equal(breakdown.shippingCollectedCop, 26_374);
  assert.equal(breakdown.shippingPendingCop, 37_626);
  assert.equal(breakdown.receivedForMerchandiseCop, 273_626);
});

test("solo reconoce todo el envio cuando el pedido esta pagado", () => {
  const breakdown = getOrderFinancialBreakdown(makeOrder({ paidCop: 728_000 }));

  assert.equal(breakdown.shippingCollectedCop, 64_000);
  assert.equal(breakdown.shippingPendingCop, 0);
});

test("un pedido sin pagos no alimenta el fondo de envios", () => {
  const breakdown = getOrderFinancialBreakdown(makeOrder());

  assert.equal(breakdown.shippingCollectedCop, 0);
  assert.equal(breakdown.shippingPendingCop, 64_000);
});

test("calcula el capital financiado solo despues de registrar la compra", () => {
  const beforePurchase = getOrderFinancialBreakdown(makeOrder({ paidCop: 300_000 }));
  const afterPurchase = getOrderFinancialBreakdown(
    makeOrder({ paidCop: 300_000, purchased: true })
  );

  assert.equal(beforePurchase.capitalFinancedCop, 0);
  assert.equal(afterPurchase.capitalInvestedCop, 500_000);
  assert.equal(afterPurchase.capitalFinancedCop, 226_374);
});

test("el reparto por producto coincide exactamente con el total recaudado", () => {
  const order = makeOrder({
    totalCop: 600_000,
    paidCop: 200_000,
    items: [
      {
        productId: "product-1",
        productName: "Producto 1",
        quantity: 1,
        unitPriceCop: 300_000,
        unitCostCop: 180_000,
        unitShippingCostCop: 17_000,
        lineTotalCop: 300_000,
        saleMode: "preorder",
        paymentPolicy: "split_50_50",
      },
      {
        productId: "product-2",
        productName: "Producto 2",
        quantity: 1,
        unitPriceCop: 300_000,
        unitCostCop: 170_000,
        unitShippingCostCop: 34_000,
        lineTotalCop: 300_000,
        saleMode: "preorder",
        paymentPolicy: "split_50_50",
      },
    ],
  });
  const breakdown = getOrderFinancialBreakdown(order);
  const allocations = getItemShippingAllocations(order);

  assert.equal(
    allocations.reduce((sum, allocation) => sum + allocation.collectedAmountCop, 0),
    breakdown.shippingCollectedCop
  );
  assert.equal(
    allocations.reduce((sum, allocation) => sum + allocation.pendingAmountCop, 0),
    breakdown.shippingPendingCop
  );
});
