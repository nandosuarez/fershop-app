import assert from "node:assert/strict";
import test from "node:test";

import {
  getItemShippingAllocations,
  getOrderFinancialBreakdown,
  getOrderPurchaseFundingBreakdown,
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

test("calcula producto mas envio menos anticipo como dinero propio", () => {
  const order = makeOrder({
    totalCop: 500_000,
    paidCop: 200_000,
    items: [
      {
        productId: "product-1",
        productName: "Producto",
        quantity: 1,
        unitPriceCop: 500_000,
        unitCostCop: 300_000,
        unitShippingCostCop: 20_000,
        lineTotalCop: 500_000,
        saleMode: "preorder",
        paymentPolicy: "split_50_50",
      },
    ],
  });
  const breakdown = getOrderPurchaseFundingBreakdown(order);

  assert.equal(breakdown.saleTotalCop, 500_000);
  assert.equal(breakdown.totalPurchaseCostCop, 320_000);
  assert.equal(breakdown.customerContributionCop, 200_000);
  assert.equal(breakdown.ownCapitalCop, 120_000);
  assert.equal(breakdown.customerContributionPercent, 62.5);
  assert.equal(breakdown.ownCapitalPercent, 37.5);
});

test("un pedido sin anticipo deja todo el costo y el envio como dinero propio", () => {
  const breakdown = getOrderPurchaseFundingBreakdown(makeOrder());

  assert.equal(breakdown.totalPurchaseCostCop, 564_000);
  assert.equal(breakdown.customerContributionCop, 0);
  assert.equal(breakdown.ownCapitalCop, 564_000);
  assert.equal(breakdown.ownCapitalPercent, 100);
});

test("un pago posterior recupera caja pero no cambia el dinero usado al comprar", () => {
  const order = makeOrder({ paidCop: 0, purchased: true });
  order.payments = [
    {
      id: "advance",
      kind: "advance",
      statusCode: "received",
      statusLabel: "Anticipo",
      amountCop: 200_000,
      recordedAtIso: "2026-10-29T15:00:00.000Z",
      recordedAtLabel: "Antes de comprar",
      note: "",
    },
    {
      id: "balance",
      kind: "balance",
      statusCode: "received",
      statusLabel: "Saldo",
      amountCop: 528_000,
      recordedAtIso: "2026-10-31T15:00:00.000Z",
      recordedAtLabel: "Despues de comprar",
      note: "",
    },
  ];
  const breakdown = getOrderPurchaseFundingBreakdown(order);

  assert.equal(breakdown.customerContributionCop, 200_000);
  assert.equal(breakdown.ownCapitalCop, 364_000);
  assert.equal(breakdown.totalPaidCop, 728_000);
  assert.equal(breakdown.paidAfterPurchaseCop, 528_000);
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
